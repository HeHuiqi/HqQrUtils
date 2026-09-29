//
//  ScanDatabase.h
//  HqQrUtils - iOS SQLite 数据库 (Objective-C 包装层)
//
//  封装 SQLite3 C API，提供与 Android Room DAO 一致的接口:
//  insertOrReplace / deleteById / clearAll / updateFavorite / getAllRecordsAsJSONString
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ScanRecordObject : NSObject <NSCopying>

@property (nonatomic, strong) NSString *identifier;
@property (nonatomic, strong) NSString *content;
@property (nonatomic, strong) NSString *type;
@property (nonatomic, strong) NSString *title;
@property (nonatomic, strong) NSString *category;
@property (nonatomic, assign) BOOL isFavorite;
@property (nonatomic, assign) long long createdAt;
@property (nonatomic, strong) NSString *fgColor;
@property (nonatomic, strong) NSString *bgColor;
@property (nonatomic, strong) NSString *ecl;
@property (nonatomic, assign) NSInteger cellSize;
@property (nonatomic, assign) NSInteger margin;

- (instancetype)initWithIdentifier:(NSString *)identifier
                           content:(NSString *)content
                              type:(NSString *)type
                             title:(NSString *)title
                          category:(NSString *)category
                       isFavorite:(BOOL)isFavorite
                        createdAt:(long long)createdAt;

- (instancetype)initWithDictionary:(NSDictionary *)dict;
- (NSDictionary *)toDictionary;
- (NSString *)toJSONString;

@end

@interface ScanDatabase : NSObject

+ (instancetype)shared;

/// 插入或替换记录 (Web → Native 同步)
- (void)insertOrReplace:(ScanRecordObject *)record;

/// 插入单条记录 (Native 扫码保存)
- (void)insert:(ScanRecordObject *)record;

/// 根据 ID 删除记录
- (int)deleteById:(NSString *)recordId;

/// 清空所有记录
- (void)clearAll;

/// 更新星标状态
- (void)updateFavorite:(NSString *)recordId isFavorite:(BOOL)isFavorite;

/// 获取所有记录 (JSON 字符串，供 NativeHost.emitDatabaseSync)
- (NSString *)getAllRecordsAsJSONString;

/// 获取所有记录 (字典数组)
- (NSArray<NSDictionary *> *)getAllRecords;

@end

NS_ASSUME_NONNULL_END
