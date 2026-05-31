import Foundation

struct EventPhoto: Identifiable, Codable {
    let id: UUID
    let event_id: UUID
    let file_path: String
    let original_filename: String
    let caption: String?
    let display_order: Int
    let is_cover: Bool
}

struct Waypoint: Codable, Identifiable {
    let order: Int
    let lat: Double
    let lng: Double
    let label: String

    var id: Int { order }
}

struct Event: Identifiable, Codable, Equatable, Hashable {
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
    let organization_id: String?
    let organization_name: String?
    let organization_logo_url: String?
    let organizer_name: String?
    let cover_photo_url: String?
    var photos: [EventPhoto]? = nil
    var fee: Double? = nil
    var is_free: Bool? = nil
    var latitude: Double? = nil
    var longitude: Double? = nil
    var waypoints: [Waypoint]? = nil

    static func == (lhs: Event, rhs: Event) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

struct EventListResponse: Codable {
    let items: [Event]
    let total: Int
}
