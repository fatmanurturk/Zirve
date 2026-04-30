import Foundation

struct Event: Identifiable, Codable {
    let id: String
    let title: String
    let description: String?
    let category: String
    let difficulty: String
    let location_name: String?
    let start_date: String
    let end_date: String
    let max_volunteers: Int?
    let status: String
    let created_by: String
}

struct EventListResponse: Codable {
    let items: [Event]
    let total: Int
}
