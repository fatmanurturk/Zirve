import Foundation

enum Config {
    // Geliştirme sırasında Mac'in yerel IP'si buradan güncellenir.
    // Simülatör için "localhost", fiziksel cihaz için Mac'in Wi-Fi IP'si kullanılır.
    #if targetEnvironment(simulator)
    static let serverURL = "http://localhost:8000"
    #else
    static let serverURL = "http://172.2.0.114:8000"
    #endif

    static let baseURL = "\(serverURL)/api/v1"
}
