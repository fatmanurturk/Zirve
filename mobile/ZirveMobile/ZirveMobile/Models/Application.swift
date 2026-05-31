import Foundation

struct ApplicationItem: Codable, Identifiable {
    let id: String
    let event_id: String
    let volunteer_id: String
    let motivation_letter: String?
    let status: String
    let applied_at: String
    let reviewer_note: String?
    let checked_in: Bool?
    let volunteer_name: String?
    let volunteer_avatar_url: String?
    let event_title: String?
    let event_start_date: String?
    let event_location_name: String?
    let event_category: String?
    let event_difficulty: String?
}

struct ApplicationListResponse: Codable {
    let items: [ApplicationItem]
    let total: Int
}
