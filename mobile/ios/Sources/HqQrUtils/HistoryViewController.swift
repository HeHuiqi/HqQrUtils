//
//  HistoryViewController.swift
//  HqQrUtils - iOS 原生历史记录列表 (对应 Android ScanHistoryActivity)
//

import UIKit

class HistoryViewController: UIViewController {

    private let tableView = UITableView(frame: .zero, style: .plain)
    private let database = ScanDatabase.shared()
    private var records: [[String: Any]] = []
    var onDismiss: (() -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "扫码历史记录"
        view.backgroundColor = UIColor.systemBackground

        setupNavigationBar()
        setupTableView()
        loadRecords()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadRecords()
    }

    private func setupNavigationBar() {
        let appearance = UINavigationBarAppearance()
        appearance.backgroundColor = UIColor(red: 0.145, green: 0.388, blue: 0.922, alpha: 1.0) // #2563EB
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]
        navigationController?.navigationBar.standardAppearance = appearance
        navigationController?.navigationBar.scrollEdgeAppearance = appearance
        navigationController?.navigationBar.tintColor = .white

        // 左侧关闭/完成按钮
        let closeButton = UIBarButtonItem(
            title: "完成",
            style: .done,
            target: self,
            action: #selector(closeTapped)
        )
        closeButton.tintColor = .white
        navigationItem.leftBarButtonItem = closeButton

        // 右侧清空按钮
        let clearButton = UIBarButtonItem(
            title: "清空",
            style: .plain,
            target: self,
            action: #selector(clearAllTapped)
        )
        clearButton.tintColor = .white
        navigationItem.rightBarButtonItem = clearButton
    }

    private func setupTableView() {
        view.addSubview(tableView)
        tableView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(HistoryCell.self, forCellReuseIdentifier: "HistoryCell")
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 100
        tableView.tableFooterView = UIView()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
        onDismiss?()
    }

    private func loadRecords() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            let all = self.database.getAllRecordsSwift()
            DispatchQueue.main.async {
                self.records = all
                self.tableView.reloadData()
            }
        }
    }

    @objc private func closeTapped() {
        dismiss(animated: true) { [weak self] in
            self?.onDismiss?()
            NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
        }
    }

    @objc private func clearAllTapped() {
        guard !records.isEmpty else { return }

        let alert = UIAlertController(
            title: "清空历史记录",
            message: "确定要清空全部扫码历史记录吗？",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "清空", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.database.clearAll()
            self.records.removeAll()
            self.tableView.reloadData()
            NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
        })
        alert.addAction(UIAlertAction(title: "取消", style: .cancel))
        present(alert, animated: true)
    }

    private func deleteRecord(at index: Int) {
        guard index < records.count else { return }
        let record = records[index]
        guard let id = record["id"] as? String else { return }

        let alert = UIAlertController(
            title: "删除历史记录",
            message: "确定要删除此条记录吗？",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "删除", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.database.delete(byId: id)
            self.records.remove(at: index)
            self.tableView.deleteRows(at: [IndexPath(row: index, section: 0)], with: .automatic)
            NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
        })
        alert.addAction(UIAlertAction(title: "取消", style: .cancel))
        present(alert, animated: true)
    }

    private func copyToClipboard(_ content: String) {
        let pasteboard = UIPasteboard.general
        pasteboard.string = content
        ToastHUD.shared.show(message: "记录内容已复制到剪贴板", type: .success)
    }
}

// MARK: - UITableViewDataSource

extension HistoryViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        if records.isEmpty {
            let emptyLabel = UILabel(frame: CGRect(x: 0, y: 0, width: tableView.bounds.size.width, height: tableView.bounds.size.height))
            emptyLabel.text = "暂无扫码历史记录"
            emptyLabel.textColor = .secondaryLabel
            emptyLabel.textAlignment = .center
            emptyLabel.font = UIFont.systemFont(ofSize: 15)
            tableView.backgroundView = emptyLabel
        } else {
            tableView.backgroundView = nil
        }
        return records.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "HistoryCell", for: indexPath) as! HistoryCell

        let record = records[indexPath.row]
        cell.configure(
            title: record["title"] as? String ?? "未命名",
            content: record["content"] as? String ?? "",
            type: record["type"] as? String ?? "QR_CODE",
            timeString: formatTime(record["createdAt"] as? Int64 ?? 0),
            isFavorite: record["isFavorite"] as? Bool ?? false
        )
        return cell
    }

    private func formatTime(_ timestamp: Int64) -> String {
        guard timestamp > 0 else { return "未知时间" }
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: date)
    }
}

// MARK: - UITableViewDelegate

extension HistoryViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let record = records[indexPath.row]
        copyToClipboard(record["content"] as? String ?? "")
    }

    func tableView(_ tableView: UITableView,
                   trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        let deleteAction = UIContextualAction(style: .destructive, title: "删除") { [weak self] _, _, completionHandler in
            self?.deleteRecord(at: indexPath.row)
            completionHandler(true)
        }
        return UISwipeActionsConfiguration(actions: [deleteAction])
    }

    func tableView(_ tableView: UITableView,
                   leadingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        guard indexPath.row < records.count else { return nil }
        var record = records[indexPath.row]
        guard let id = record["id"] as? String else { return nil }
        let isFav = (record["isFavorite"] as? Bool) ?? false

        let title = isFav ? "取消收藏" : "收藏"
        let action = UIContextualAction(style: .normal, title: title) { [weak self] _, _, completionHandler in
            guard let self = self else { return }
            self.database.updateFavorite(id, isFavorite: !isFav)
            record["isFavorite"] = !isFav
            self.records[indexPath.row] = record
            self.tableView.reloadRows(at: [indexPath], with: .automatic)
            NotificationCenter.default.post(name: .scanDatabaseDidChange, object: nil)
            completionHandler(true)
        }
        action.backgroundColor = isFav ? .systemGray : .systemYellow
        return UISwipeActionsConfiguration(actions: [action])
    }
}
