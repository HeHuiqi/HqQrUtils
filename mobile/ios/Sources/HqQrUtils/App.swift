//
//  HqQrUtils - iOS App Entry Point
//  QR Code Generator & Scanner (iOS Native)
//

import SwiftUI

@main
struct HqQrUtilsApp: App {
    var body: some Scene {
        WindowGroup {
            WebViewContainer()
                .ignoresSafeArea()
        }
    }
}
