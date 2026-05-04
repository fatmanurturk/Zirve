import SwiftUI

struct EventDetailView: View {
    let event: Event
    
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                
                // Kapak Görseli veya Gradient Arka Plan
                ZStack(alignment: .bottomLeading) {
                    LinearGradient(
                        colors: [Color.green.opacity(0.8), Color.mint.opacity(0.6)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(height: 250)
                    .cornerRadius(16, corners: [.bottomLeft, .bottomRight])
                    .shadow(radius: 5)
                    
                    VStack(alignment: .leading, spacing: 5) {
                        Text(event.category.uppercased())
                            .font(.caption)
                            .fontWeight(.bold)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.black.opacity(0.3))
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        
                        Text(event.title)
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .lineLimit(3)
                    }
                    .padding(20)
                }
                .ignoresSafeArea(edges: .top)
                
                VStack(alignment: .leading, spacing: 24) {
                    // Temel Bilgi Kartları
                    HStack(alignment: .top, spacing: 15) {
                        InfoCard(icon: "calendar", title: "Tarih", value: formatDate(event.start_date))
                        InfoCard(icon: "mappin.and.ellipse", title: "Konum", value: event.location_name ?? "Belirtilmedi")
                        InfoCard(icon: "bolt.fill", title: "Zorluk", value: event.difficulty.capitalized)
                    }

                    // Kulüp & Organizatör Kartı
                    if let clubId = event.organization_id {
                        NavigationLink(destination: ClubProfileView(clubId: clubId, clubName: event.organization_name)) {
                            HStack(spacing: 14) {
                                // Logo / Baş harfler
                                ZStack {
                                    Circle()
                                        .fill(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.12))
                                        .frame(width: 48, height: 48)

                                    if let logoUrl = event.organization_logo_url,
                                       let url = URL(string: logoUrl) {
                                        AsyncImage(url: url) { image in
                                            image.resizable().scaledToFill()
                                        } placeholder: {
                                            Text(String((event.organization_name ?? "ZV").prefix(2)).uppercased())
                                                .font(.subheadline)
                                                .fontWeight(.bold)
                                                .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                        }
                                        .frame(width: 44, height: 44)
                                        .clipShape(Circle())
                                    } else {
                                        Text(String((event.organization_name ?? "ZV").prefix(2)).uppercased())
                                            .font(.subheadline)
                                            .fontWeight(.bold)
                                            .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                    }
                                }

                                VStack(alignment: .leading, spacing: 3) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "building.2.fill")
                                            .font(.caption2)
                                            .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                        Text("Düzenleyen Kulüp")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                            .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                    }
                                    Text(event.organization_name ?? "Bilinmeyen Kulüp")
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                        .foregroundColor(.primary)

                                    if let organizer = event.organizer_name {
                                        HStack(spacing: 4) {
                                            Image(systemName: "person.fill")
                                                .font(.caption2)
                                                .foregroundColor(.secondary)
                                            Text(organizer)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                }

                                Spacer()

                                VStack(spacing: 2) {
                                    Image(systemName: "chevron.right")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                    Text("Kulüp\nSayfası")
                                        .font(.caption2)
                                        .fontWeight(.medium)
                                        .foregroundColor(Color(red: 0.05, green: 0.45, blue: 0.3))
                                        .multilineTextAlignment(.center)
                                }
                            }
                            .padding(14)
                            .background(
                                LinearGradient(
                                    colors: [
                                        Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.06),
                                        Color(red: 0.2, green: 0.7, blue: 0.55).opacity(0.06)
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(14)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(Color(red: 0.05, green: 0.45, blue: 0.3).opacity(0.2), lineWidth: 1)
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }

                    if let maxVol = event.max_volunteers {
                        HStack {
                            Image(systemName: "person.3.sequence.fill")
                                .foregroundColor(.green)
                            Text("Kontenjan: \(maxVol) Gönüllü")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 15)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(10)
                    }
                    
                    Divider()
                    
                    // Açıklama
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Etkinlik Detayları")
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        Text(event.description ?? "Bu etkinlik için bir açıklama girilmemiştir.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .lineSpacing(4)
                    }
                    
                    Spacer(minLength: 40)
                    
                    // Başvur veya Düzenle Butonu
                    if authManager.currentUser?.id == event.created_by {
                        VStack(spacing: 12) {
                            NavigationLink(destination: EventApplicantsView(eventId: event.id)) {
                                HStack(spacing: 8) {
                                    Image(systemName: "person.2.fill")
                                    Text("Başvuruları Görüntüle")
                                }
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(red: 0.05, green: 0.45, blue: 0.3))
                                .cornerRadius(16)
                                .shadow(color: Color.green.opacity(0.3), radius: 8, x: 0, y: 5)
                            }
                            
                            NavigationLink(destination: EditEventView(event: event)) {
                                HStack(spacing: 8) {
                                    Image(systemName: "pencil")
                                    Text("Etkinliği Düzenle")
                                }
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    LinearGradient(
                                        colors: [Color.blue, Color.cyan],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(16)
                                .shadow(color: .blue.opacity(0.3), radius: 8, x: 0, y: 5)
                            }
                        }
                        .padding(.bottom, 30)
                    } else {
                        NavigationLink(destination: EventApplicationView(event: event)) {
                            HStack(spacing: 8) {
                                Image(systemName: "paperplane.fill")
                                Text("Etkinliğe Başvur")
                            }
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                LinearGradient(
                                    colors: [Color.green, Color.mint],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(16)
                            .shadow(color: .green.opacity(0.3), radius: 8, x: 0, y: 5)
                        }
                        .padding(.bottom, 30)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return isoString
    }
}

// Helper: Custom Corner Radius
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}

struct InfoCard: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.green)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 3, x: 0, y: 2)
    }
}

#Preview {
    EventDetailView(event: Event(
        id: "1",
        title: "Kışın Zorlu Tırmanışı ve Kamp Eğitimi",
        description: "Katılımcılarımızla birlikte kış koşullarında zirveye tırmanacağız. Lütfen ekipmanlarınızı tam getirin. Bu etkinlikte ip teknikleri gösterilecektir.",
        category: "Doga Yuruyusu",
        difficulty: "Zor",
        location_name: "Uludağ Zirve, Bursa",
        start_date: "2026-03-31T09:00:00Z",
        end_date: "2026-04-01T15:00:00Z",
        max_volunteers: 15,
        status: "OPEN",
        created_by: "test-user-id",
        organization_id: "club-preview-id",
        organization_name: "Zirve Dağcılık Kulübü",
        organization_logo_url: nil,
        organizer_name: "Ahmet Yılmaz"
    ))
    .environmentObject(AuthManager())
}
