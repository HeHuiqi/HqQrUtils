// swift-tools-version:5.9
// The swift-tools-version declares the minimum Swift version for package Targets.

import PackageDescription

let package = Package(
    name: "HqQrUtils",
    platforms: [
        .iOS(.v14)
    ],
    products: [
        .library(
            name: "HqQrUtils",
            targets: ["HqQrUtils"]
        )
    ],
    dependencies: [
        // SQLite.swift 或其他依赖 (如需)
    ],
    targets: [
        .target(
            name: "HqQrUtils",
            dependencies: [],
            path: "Sources/HqQrUtils",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
