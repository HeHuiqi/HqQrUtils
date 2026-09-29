//
//  ScanDatabase.m
//  HqQrUtils - iOS SQLite 数据库实现 (Objective-C)
//
//  使用 SQLite3 C API，直接操作本地 SQLite 数据库
//  数据库文件位于 iOS 沙盒的 Documents 目录
//

#import <Foundation/Foundation.h>
#import "ScanDatabase.h"
#import <sqlite3.h>

@implementation ScanRecordObject

- (instancetype)initWithIdentifier:(NSString *)identifier
                           content:(NSString *)content
                              type:(NSString *)type
                             title:(NSString *)title
                          category:(NSString *)category
                       isFavorite:(BOOL)isFavorite
                        createdAt:(long long)createdAt {
    self = [super init];
    if (self) {
        _identifier = identifier ?: [[NSUUID UUID] UUIDString];
        _content = content ?: @"";
        _type = type ?: @"QR_CODE";
        _title = title ?: @"";
        _category = category ?: @"none";
        _isFavorite = isFavorite;
        _createdAt = createdAt;
        _fgColor = @"#0f172a";
        _bgColor = @"#ffffff";
        _ecl = @"M";
        _cellSize = 8;
        _margin = 4;
    }
    return self;
}

- (instancetype)initWithDictionary:(NSDictionary *)dict {
    NSString *identifier = dict[@"id"] ?: [[NSUUID UUID] UUIDString];
    NSString *content = dict[@"content"] ?: @"";
    NSString *type = dict[@"type"] ?: @"QR_CODE";
    NSString *title = dict[@"title"] ?: @"";
    NSString *category = dict[@"category"] ?: @"none";
    BOOL isFavorite = [dict[@"isFavorite"] boolValue];
    long long createdAt = [dict[@"createdAt"] longLongValue];

    ScanRecordObject *record = [self initWithIdentifier:identifier
                                                 content:content
                                                    type:type
                                                   title:title
                                              category:category
                                          isFavorite:isFavorite
                                           createdAt:createdAt];

    if (dict[@"fgColor"]) record.fgColor = dict[@"fgColor"];
    if (dict[@"bgColor"]) record.bgColor = dict[@"bgColor"];
    if (dict[@"ecl"]) record.ecl = dict[@"ecl"];
    if (dict[@"cellSize"]) record.cellSize = [dict[@"cellSize"] integerValue];
    if (dict[@"margin"]) record.margin = [dict[@"margin"] integerValue];

    return record;
}

- (NSDictionary *)toDictionary {
    return @{
        @"id": _identifier,
        @"content": _content,
        @"type": _type,
        @"title": _title,
        @"category": _category,
        @"isFavorite": @(_isFavorite),
        @"createdAt": @(_createdAt),
        @"fgColor": _fgColor,
        @"bgColor": _bgColor,
        @"ecl": _ecl,
        @"cellSize": @(_cellSize),
        @"margin": @(_margin)
    };
}

- (NSString *)toJSONString {
    NSDictionary *dict = [self toDictionary];
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:dict options:0 error:&error];
    if (jsonData) {
        return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    }
    return @"{}";
}

- (id)copyWithZone:(NSZone *)zone {
    ScanRecordObject *copy = [[[self class] allocWithZone:zone] init];
    copy.identifier = _identifier;
    copy.content = _content;
    copy.type = _type;
    copy.title = _title;
    copy.category = _category;
    copy.isFavorite = _isFavorite;
    copy.createdAt = _createdAt;
    copy.fgColor = _fgColor;
    copy.bgColor = _bgColor;
    copy.ecl = _ecl;
    copy.cellSize = _cellSize;
    copy.margin = _margin;
    return copy;
}

@end

@implementation ScanDatabase {
    sqlite3 *_db;
    NSString *_dbPath;
    NSRecursiveLock *_lock;
}

+ (instancetype)shared {
    static ScanDatabase *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[ScanDatabase alloc] init];
    });
    return instance;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _lock = [[NSRecursiveLock alloc] init];
        [self openDatabase];
        [self createTable];
    }
    return self;
}

- (void)dealloc {
    [_lock lock];
    if (_db) {
        sqlite3_close(_db);
        _db = NULL;
    }
    [_lock unlock];
}

- (void)openDatabase {
    [_lock lock];
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documents = paths.firstObject;
    _dbPath = [documents stringByAppendingPathComponent:@"hq_scan_records.db"];

    int rc = sqlite3_open_v2([_dbPath UTF8String],
                             &_db,
                             SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX,
                             NULL);
    if (rc != SQLITE_OK) {
        NSLog(@"❌ [iOS DB] 无法打开数据库: %@ (code: %d)", _dbPath, rc);
        _db = NULL;
        [_lock unlock];
        return;
    }
    sqlite3_busy_timeout(_db, 3000);
    sqlite3_exec(_db, "PRAGMA foreign_keys = ON;", NULL, NULL, NULL);
    sqlite3_exec(_db, "PRAGMA journal_mode = WAL;", NULL, NULL, NULL);
    [_lock unlock];
}

- (void)createTable {
    [_lock lock];
    if (!_db) {
        [_lock unlock];
        return;
    }

    const char *sql =
        "CREATE TABLE IF NOT EXISTS scan_records ("
        "  id TEXT PRIMARY KEY NOT NULL,"
        "  content TEXT NOT NULL,"
        "  type TEXT NOT NULL DEFAULT 'QR_CODE',"
        "  title TEXT,"
        "  category TEXT NOT NULL DEFAULT 'none',"
        "  isFavorite INTEGER NOT NULL DEFAULT 0,"
        "  createdAt INTEGER NOT NULL,"
        "  fgColor TEXT NOT NULL DEFAULT '#0f172a',"
        "  bgColor TEXT NOT NULL DEFAULT '#ffffff',"
        "  ecl TEXT NOT NULL DEFAULT 'M',"
        "  cellSize INTEGER NOT NULL DEFAULT 8,"
        "  margin INTEGER NOT NULL DEFAULT 4"
        ");";

    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(_db, sql, -1, &stmt, NULL) == SQLITE_OK) {
        sqlite3_step(stmt);
    }
    if (stmt) {
        sqlite3_finalize(stmt);
    }
    [_lock unlock];
}

- (void)insertOrReplace:(ScanRecordObject *)record {
    if (!record) return;
    [_lock lock];
    if (!_db) {
        [_lock unlock];
        return;
    }

    const char *sql =
        "INSERT OR REPLACE INTO scan_records "
        "(id, content, type, title, category, isFavorite, createdAt, fgColor, bgColor, ecl, cellSize, margin) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(_db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        NSLog(@"❌ [iOS DB] 插入准备失败: %s", sqlite3_errmsg(_db));
        [_lock unlock];
        return;
    }

    sqlite3_bind_text(stmt, 1, [record.identifier UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, [record.content UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, [record.type UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, [record.title UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, [record.category UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 6, record.isFavorite ? 1 : 0);
    sqlite3_bind_int64(stmt, 7, record.createdAt);
    sqlite3_bind_text(stmt, 8, [record.fgColor UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, [record.bgColor UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 10, [record.ecl UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 11, (int)record.cellSize);
    sqlite3_bind_int(stmt, 12, (int)record.margin);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        NSLog(@"❌ [iOS DB] 插入失败: %s", sqlite3_errmsg(_db));
    }
    sqlite3_finalize(stmt);
    [_lock unlock];
}

- (void)insert:(ScanRecordObject *)record {
    [self insertOrReplace:record];
}

- (int)deleteById:(NSString *)recordId {
    if (!recordId) return 0;
    [_lock lock];
    if (!_db) {
        [_lock unlock];
        return 0;
    }

    const char *sql = "DELETE FROM scan_records WHERE id = ?;";
    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(_db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        NSLog(@"❌ [iOS DB] 删除准备失败: %s", sqlite3_errmsg(_db));
        [_lock unlock];
        return 0;
    }
    sqlite3_bind_text(stmt, 1, [recordId UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_step(stmt);
    int changes = (int)sqlite3_changes(_db);
    sqlite3_finalize(stmt);
    [_lock unlock];
    return changes;
}

- (void)clearAll {
    [_lock lock];
    if (!_db) {
        [_lock unlock];
        return;
    }

    const char *sql = "DELETE FROM scan_records;";
    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(_db, sql, -1, &stmt, NULL) == SQLITE_OK) {
        sqlite3_step(stmt);
    } else {
        NSLog(@"❌ [iOS DB] 清空失败: %s", sqlite3_errmsg(_db));
    }
    if (stmt) {
        sqlite3_finalize(stmt);
    }
    [_lock unlock];
}

- (void)updateFavorite:(NSString *)recordId isFavorite:(BOOL)isFavorite {
    if (!recordId) return;
    [_lock lock];
    if (!_db) {
        [_lock unlock];
        return;
    }

    const char *sql = "UPDATE scan_records SET isFavorite = ? WHERE id = ?;";
    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(_db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        NSLog(@"❌ [iOS DB] 更新收藏失败: %s", sqlite3_errmsg(_db));
        [_lock unlock];
        return;
    }
    sqlite3_bind_int(stmt, 1, isFavorite ? 1 : 0);
    sqlite3_bind_text(stmt, 2, [recordId UTF8String], -1, SQLITE_TRANSIENT);
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    [_lock unlock];
}

- (NSArray<NSDictionary *> *)getAllRecords {
    NSMutableArray *records = [NSMutableArray array];
    [_lock lock];
    if (!_db) {
        [_lock unlock];
        return records;
    }

    const char *sql = "SELECT * FROM scan_records ORDER BY isFavorite DESC, createdAt DESC;";
    sqlite3_stmt *stmt = NULL;
    if (sqlite3_prepare_v2(_db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        NSLog(@"❌ [iOS DB] 查询失败: %s", sqlite3_errmsg(_db));
        [_lock unlock];
        return records;
    }

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        const char *rawId = (const char *)sqlite3_column_text(stmt, 0);
        const char *rawContent = (const char *)sqlite3_column_text(stmt, 1);
        const char *rawType = (const char *)sqlite3_column_text(stmt, 2);
        const char *rawTitle = (const char *)sqlite3_column_text(stmt, 3);
        const char *rawCategory = (const char *)sqlite3_column_text(stmt, 4);
        int rawIsFav = sqlite3_column_int(stmt, 5);
        long long rawCreatedAt = sqlite3_column_int64(stmt, 6);
        const char *rawFg = (const char *)sqlite3_column_text(stmt, 7);
        const char *rawBg = (const char *)sqlite3_column_text(stmt, 8);
        const char *rawEcl = (const char *)sqlite3_column_text(stmt, 9);
        int rawCellSize = sqlite3_column_int(stmt, 10);
        int rawMargin = sqlite3_column_int(stmt, 11);

        NSString *identifier = rawId ? [NSString stringWithUTF8String:rawId] : @"";
        NSString *content = rawContent ? [NSString stringWithUTF8String:rawContent] : @"";
        NSString *type = rawType ? [NSString stringWithUTF8String:rawType] : @"QR_CODE";
        NSString *title = rawTitle ? [NSString stringWithUTF8String:rawTitle] : @"";
        NSString *category = rawCategory ? [NSString stringWithUTF8String:rawCategory] : @"none";
        BOOL isFavorite = (rawIsFav == 1);
        long long createdAt = rawCreatedAt;
        NSString *fgColor = rawFg ? [NSString stringWithUTF8String:rawFg] : @"#0f172a";
        NSString *bgColor = rawBg ? [NSString stringWithUTF8String:rawBg] : @"#ffffff";
        NSString *ecl = rawEcl ? [NSString stringWithUTF8String:rawEcl] : @"M";
        NSInteger cellSize = rawCellSize > 0 ? rawCellSize : 8;
        NSInteger margin = rawMargin >= 0 ? rawMargin : 4;

        ScanRecordObject *record = [[ScanRecordObject alloc] initWithIdentifier:identifier
                                                                         content:content
                                                                            type:type
                                                                           title:title
                                                                      category:category
                                                                  isFavorite:isFavorite
                                                                   createdAt:createdAt];
        record.fgColor = fgColor;
        record.bgColor = bgColor;
        record.ecl = ecl;
        record.cellSize = cellSize;
        record.margin = margin;

        [records addObject:[record toDictionary]];
    }

    sqlite3_finalize(stmt);
    [_lock unlock];
    return records;
}

- (NSString *)getAllRecordsAsJSONString {
    NSArray *records = [self getAllRecords];
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:records options:0 error:&error];
    if (jsonData) {
        return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    }
    return @"[]";
}

@end
