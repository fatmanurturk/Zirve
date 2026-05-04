import Foundation

struct ApplicationItem: Codable, Identifiable {
    let id: String
    let event_id: String
    let volunteer_id: String
    let motivation_letter: String?
    let status: String
    let applied_at: String
    let volunteer_name: String?
    let volunteer_avatar_url: String?
}

struct ApplicationListResponse: Codable {
    let items: [ApplicationItem]
    let total: Int
}
