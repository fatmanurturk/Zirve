import SwiftUI

// MARK: - Models
struct AIChatMessage: Identifiable {
    let id = UUID()
    let text: String
    let isUser: Bool
    let city: String?
    let activity: String?

    init(text: String, isUser: Bool, city: String? = nil, activity: String? = nil) {
        self.text = text
        self.isUser = isUser
        self.city = city
        self.activity = activity
    }
}

struct AIIntentAPIResponse: Codable {
    let city: String?
    let activity: String?
    let model_text: String?
}

// MARK: - ViewModel
@MainActor
class AIChatViewModel: ObservableObject {
    @Published var messages: [AIChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false

    private let baseURL = Config.baseURL

    let suggestions = [
        "Bu hafta açık etkinlikler neler?",
        "Ankara'da hiking önerir misin?",
        "Başlangıç seviyesi etkinlik var mı?",
        "Zor tırmanış etkinlikleri göster",
    ]

    func sendMessage(_ text: String? = nil) async {
        let msg = (text ?? inputText).trimmingCharacters(in: .whitespaces)
        guard !msg.isEmpty else { return }

        inputText = ""
        messages.append(AIChatMessage(text: msg, isUser: true))
        isLoading = true

        guard let url = URL(string: "\(baseURL)/ai/intent") else {
            appendError()
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONEncoder().encode(["message": msg])
            let (data, response) = try await URLSession.shared.data(for: request)

            if let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 {
                let decoded = try JSONDecoder().decode(AIIntentAPIResponse.self, from: data)
                let reply = decoded.model_text ?? "Üzgünüm, bir sorun oluştu. Lütfen tekrar deneyin."
                messages.append(AIChatMessage(
                    text: reply,
                    isUser: false,
                    city: decoded.city,
                    activity: decoded.activity
                ))
            } else {
                appendError()
            }
        } catch {
            appendError()
        }

        isLoading = false
    }

    private func appendError() {
        messages.append(AIChatMessage(
            text: "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.",
            isUser: false
        ))
        isLoading = false
    }
}

// MARK: - AIChatView
struct AIChatView: View {
    @StateObject private var viewModel = AIChatViewModel()
    @FocusState private var isFocused: Bool

    private let accentGreen = Color(red: 0.05, green: 0.45, blue: 0.3)

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                chatScrollArea
                Divider()
                inputBar
            }
            .background(Color(UIColor.secondarySystemBackground).ignoresSafeArea())
            .navigationTitle("AI Asistan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { navToolbar }
        }
    }

    @ToolbarContentBuilder
    private var navToolbar: some ToolbarContent {
        ToolbarItem(placement: .principal) {
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .foregroundColor(accentGreen)
                    .font(.subheadline)
                Text("AI Asistan")
                    .font(.headline)
                    .fontWeight(.semibold)
            }
        }
    }

    private var chatScrollArea: some View {
        ScrollViewReader { proxy in
            ScrollView {
                chatMessageList
            }
            .onChange(of: viewModel.messages.count) { _ in
                withAnimation {
                    if let lastId = viewModel.messages.last?.id {
                        proxy.scrollTo(lastId.uuidString, anchor: .bottom)
                    } else {
                        proxy.scrollTo("typing", anchor: .bottom)
                    }
                }
            }
            .onChange(of: viewModel.isLoading) { loading in
                if loading {
                    withAnimation { proxy.scrollTo("typing", anchor: .bottom) }
                }
            }
        }
    }

    private var chatMessageList: some View {
        LazyVStack(spacing: 12) {
            if viewModel.messages.isEmpty {
                welcomeSection
            }
            ForEach(viewModel.messages) { message in
                MessageBubble(message: message, accentGreen: accentGreen)
                    .id(message.id.uuidString)
            }
            if viewModel.isLoading {
                typingIndicator
                    .id("typing")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    // MARK: - Welcome Section
    private var welcomeSection: some View {
        VStack(spacing: 20) {
            // Bot avatar
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [accentGreen, Color(red: 0.03, green: 0.30, blue: 0.18)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 64, height: 64)
                Image(systemName: "sparkles")
                    .font(.title2)
                    .foregroundColor(.white)
            }
            .shadow(color: accentGreen.opacity(0.3), radius: 8, x: 0, y: 4)

            VStack(spacing: 6) {
                Text("Zirve AI Asistanı")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)

                Text("Doğa sporları etkinlikleri hakkında soru sor,\nşehir veya aktiviteye göre öneri al.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }

            // Suggestions
            VStack(spacing: 8) {
                ForEach(viewModel.suggestions, id: \.self) { suggestion in
                    Button(action: {
                        Task { await viewModel.sendMessage(suggestion) }
                    }) {
                        HStack {
                            Text(suggestion)
                                .font(.subheadline)
                                .foregroundColor(accentGreen)
                                .multilineTextAlignment(.leading)
                            Spacer()
                            Image(systemName: "arrow.up.circle.fill")
                                .foregroundColor(accentGreen.opacity(0.5))
                                .font(.caption)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(accentGreen.opacity(0.06))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(accentGreen.opacity(0.15), lineWidth: 1)
                        )
                    }
                }
            }
        }
        .padding(.top, 24)
        .padding(.bottom, 8)
    }

    // MARK: - Typing Indicator
    private var typingIndicator: some View {
        HStack(alignment: .bottom, spacing: 8) {
            botAvatar
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(Color.secondary.opacity(0.5))
                        .frame(width: 7, height: 7)
                        .animation(
                            Animation.easeInOut(duration: 0.5)
                                .repeatForever()
                                .delay(Double(i) * 0.15),
                            value: viewModel.isLoading
                        )
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color(UIColor.systemBackground))
            .cornerRadius(18)
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(Color.gray.opacity(0.1), lineWidth: 1)
            )
            Spacer()
        }
    }

    private var botAvatar: some View {
        ZStack {
            Circle()
                .fill(accentGreen.opacity(0.15))
                .frame(width: 30, height: 30)
            Image(systemName: "sparkles")
                .font(.caption2)
                .foregroundColor(accentGreen)
        }
    }

    // MARK: - Input Bar
    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Mesajınızı yazın...", text: $viewModel.inputText, axis: .vertical)
                .lineLimit(1...4)
                .font(.subheadline)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(UIColor.systemBackground))
                .cornerRadius(22)
                .overlay(
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                )
                .focused($isFocused)
                .onSubmit {
                    Task { await viewModel.sendMessage() }
                }

            Button(action: {
                isFocused = false
                Task { await viewModel.sendMessage() }
            }) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 34))
                    .foregroundColor(
                        viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty
                            ? Color.secondary.opacity(0.3)
                            : accentGreen
                    )
            }
            .disabled(viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isLoading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color(UIColor.secondarySystemBackground))
    }
}

// MARK: - Message Bubble
struct MessageBubble: View {
    let message: AIChatMessage
    let accentGreen: Color

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if message.isUser {
                Spacer(minLength: 60)
                userBubble
            } else {
                botBubble
                Spacer(minLength: 60)
            }
        }
    }

    private var userBubble: some View {
        Text(message.text)
            .font(.subheadline)
            .foregroundColor(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(accentGreen)
            .cornerRadius(18)
            .cornerRadius(4, corners: .bottomRight)
    }

    private var botBubble: some View {
        HStack(alignment: .bottom, spacing: 8) {
            // Bot avatar
            ZStack {
                Circle()
                    .fill(accentGreen.opacity(0.15))
                    .frame(width: 30, height: 30)
                Image(systemName: "sparkles")
                    .font(.caption2)
                    .foregroundColor(accentGreen)
            }

            VStack(alignment: .leading, spacing: 6) {
                // Tags
                if message.city != nil || message.activity != nil {
                    HStack(spacing: 6) {
                        if let city = message.city {
                            tagChip(text: "📍 \(city)", color: .blue)
                        }
                        if let activity = message.activity {
                            tagChip(text: "⛰️ \(activity)", color: accentGreen)
                        }
                    }
                }

                Text(message.text)
                    .font(.subheadline)
                    .foregroundColor(.primary)
                    .lineSpacing(3)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color(UIColor.systemBackground))
                    .cornerRadius(18)
                    .cornerRadius(4, corners: .bottomLeft)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .stroke(Color.gray.opacity(0.1), lineWidth: 1)
                    )
            }
        }
    }

    private func tagChip(text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.1))
            .cornerRadius(8)
    }
}


#Preview {
    AIChatView()
        .environmentObject(AuthManager())
}
