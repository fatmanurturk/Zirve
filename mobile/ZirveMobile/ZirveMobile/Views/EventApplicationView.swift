import SwiftUI

struct EventApplicationView: View {
    let event: Event
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    // MARK: - Adım yönetimi
    private enum ApplicationStep { case motivation, payment }
    @State private var step: ApplicationStep = .motivation

    // MARK: - Form alanları
    @State private var motivationLetter = ""

    // Kart bilgileri
    @State private var cardNumber = ""
    @State private var cardHolder = ""
    @State private var expiryMonth = ""
    @State private var expiryYear = ""
    @State private var cvv = ""

    // MARK: - UI state
    @State private var isSubmitting = false
    @State private var showSuccessAlert = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""

    // MARK: - Hesaplanan değerler
    private var isPaid: Bool {
        guard let isFree = event.is_free else { return false }
        if isFree { return false }
        return (event.fee ?? 0) > 0
    }

    private var feeText: String {
        guard let fee = event.fee else { return "₺0,00" }
        return String(format: "₺%.2f", fee).replacingOccurrences(of: ".", with: ",")
    }

    private var cardPaymentValid: Bool {
        cardNumber.filter(\.isNumber).count == 16 &&
        !cardHolder.trimmingCharacters(in: .whitespaces).isEmpty &&
        expiryMonth.count == 2 &&
        expiryYear.count == 4 &&
        (cvv.count == 3 || cvv.count == 4)
    }

    // MARK: - Body
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {

                // Etkinlik özeti kartı
                eventSummaryCard

                // Adım göstergesi (sadece ücretli)
                if isPaid { stepIndicator }

                // İçerik
                if step == .motivation {
                    motivationSection
                } else {
                    paymentSection
                }

                Spacer(minLength: 20)
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
        }
        .navigationTitle("Etkinliğe Başvur")
        .navigationBarTitleDisplayMode(.large)
        .alert("Başvurunuz Alındı! 🎉", isPresented: $showSuccessAlert) {
            Button("Tamam") { dismiss() }
        } message: {
            Text(isPaid
                 ? "Ödemeniz alındı ve başvurunuz gönderildi. Durumunuzu profil sayfanızdan takip edebilirsiniz."
                 : "Başvurunuz başarıyla gönderildi. Durumunuzu profil sayfanızdan takip edebilirsiniz.")
        }
        .alert("Hata", isPresented: $showErrorAlert) {
            Button("Tamam", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Etkinlik Özeti
    private var eventSummaryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "leaf.fill")
                    .font(.title2)
                    .foregroundColor(.green)
                Text(event.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .lineLimit(2)
            }
            HStack(spacing: 16) {
                Label(formatDate(event.start_date), systemImage: "calendar")
                    .font(.caption)
                    .foregroundColor(.secondary)
                if let location = event.location_name {
                    Label(location, systemImage: "mappin")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            if isPaid {
                HStack(spacing: 8) {
                    Image(systemName: "creditcard.fill")
                        .foregroundColor(.orange)
                    Text("Katılım ücreti: \(feeText)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.orange.opacity(0.08))
                .cornerRadius(10)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.orange.opacity(0.2), lineWidth: 1))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
    }

    // MARK: - Adım Göstergesi
    private var stepIndicator: some View {
        HStack(spacing: 0) {
            stepBadge(number: 1, label: "Başvuru", isActive: step == .motivation)
            Rectangle()
                .fill(step == .payment ? Color.orange : Color.gray.opacity(0.3))
                .frame(height: 2)
            stepBadge(number: 2, label: "Ödeme", isActive: step == .payment)
        }
        .padding(.horizontal, 4)
    }

    private func stepBadge(number: Int, label: String, isActive: Bool) -> some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(isActive
                          ? (number == 2 ? Color.orange : Color(red: 0.1, green: 0.5, blue: 0.3))
                          : Color.gray.opacity(0.25))
                    .frame(width: 28, height: 28)
                Text("\(number)")
                    .font(.caption)
                    .fontWeight(.black)
                    .foregroundColor(isActive ? .white : .secondary)
            }
            Text(label)
                .font(.caption2)
                .fontWeight(isActive ? .bold : .regular)
                .foregroundColor(isActive
                                 ? (number == 2 ? .orange : Color(red: 0.1, green: 0.5, blue: 0.3))
                                 : .secondary)
        }
    }

    // MARK: - ADIM 1: Motivasyon
    private var motivationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Motivasyon Mektubunuz")
                .font(.headline)
                .fontWeight(.bold)

            Text("Neden bu etkinliğe katılmak istiyorsunuz? (İsteğe bağlı)")
                .font(.caption)
                .foregroundColor(.secondary)

            TextEditor(text: $motivationLetter)
                .frame(minHeight: 150)
                .padding(12)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.green.opacity(0.3), lineWidth: 1))
                .overlay(alignment: .topLeading) {
                    if motivationLetter.isEmpty {
                        Text("Bu etkinliğe katılmak isteme nedeninizi yazabilirsiniz...")
                            .foregroundColor(.gray.opacity(0.5))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 20)
                            .allowsHitTesting(false)
                    }
                }

            Text("\(motivationLetter.count)/500 karakter")
                .font(.caption2)
                .foregroundColor(motivationLetter.count > 500 ? .red : .secondary)
                .frame(maxWidth: .infinity, alignment: .trailing)

            // Bilgi kutusu
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "info.circle.fill").foregroundColor(.blue)
                Text(isPaid
                     ? "Devam et butonuna bastıktan sonra kart bilgilerinizi girmeniz istenecektir."
                     : "Başvurunuz onaylandığında size bildirim gönderilecektir.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(14)
            .background(Color.blue.opacity(0.08))
            .cornerRadius(12)

            // Buton
            if isPaid {
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) { step = .payment }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "creditcard.fill")
                        Text("Devam Et — Ödeme (\(feeText))")
                            .fontWeight(.bold)
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .cornerRadius(16)
                    .shadow(color: .orange.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .disabled(motivationLetter.count > 500)
                .opacity(motivationLetter.count > 500 ? 0.6 : 1)
            } else {
                applyButton(
                    label: "Başvuruyu Gönder",
                    icon: "paperplane.fill",
                    color: LinearGradient(colors: [.green, .mint], startPoint: .leading, endPoint: .trailing),
                    disabled: isSubmitting || motivationLetter.count > 500
                ) {
                    Task { await submitApplication() }
                }
            }
        }
    }

    // MARK: - ADIM 2: Kart Bilgileri
    private var paymentSection: some View {
        VStack(alignment: .leading, spacing: 20) {

            Button {
                withAnimation(.easeInOut(duration: 0.25)) { step = .motivation }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "chevron.left")
                    Text("Geri")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
            }

            // Tutar banner
            HStack(spacing: 10) {
                Image(systemName: "banknote.fill").foregroundColor(.orange)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Ödenecek Tutar").font(.caption).foregroundColor(.secondary)
                    Text(feeText).font(.title3).fontWeight(.black).foregroundColor(.orange)
                }
                Spacer()
                Image(systemName: "lock.fill").foregroundColor(.green).font(.caption)
                Text("Güvenli Ödeme").font(.caption2).foregroundColor(.green)
            }
            .padding(14)
            .background(Color.orange.opacity(0.06))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.orange.opacity(0.2), lineWidth: 1))

            // Kart görünümü
            cardPreview

            // Form alanları
            VStack(spacing: 14) {
                // Kart Numarası
                cardField(label: "Kart Numarası", icon: "creditcard") {
                    TextField("0000 0000 0000 0000", text: $cardNumber)
                        .keyboardType(.numberPad)
                        .font(.system(.body, design: .monospaced))
                        .onChange(of: cardNumber) { _, newVal in
                            cardNumber = formatCardNumber(newVal)
                        }
                }

                // Kart Sahibi
                cardField(label: "Kart Üzerindeki İsim", icon: "person.fill") {
                    TextField("AD SOYAD", text: $cardHolder)
                        .textCase(.uppercase)
                        .onChange(of: cardHolder) { _, newVal in
                            cardHolder = newVal.uppercased()
                        }
                }

                // Son Kullanma + CVV
                HStack(spacing: 12) {
                    cardField(label: "Ay", icon: nil) {
                        TextField("MM", text: $expiryMonth)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.center)
                            .font(.system(.body, design: .monospaced))
                            .onChange(of: expiryMonth) { _, newVal in
                                expiryMonth = String(newVal.filter(\.isNumber).prefix(2))
                            }
                    }
                    cardField(label: "Yıl", icon: nil) {
                        TextField("YYYY", text: $expiryYear)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.center)
                            .font(.system(.body, design: .monospaced))
                            .onChange(of: expiryYear) { _, newVal in
                                expiryYear = String(newVal.filter(\.isNumber).prefix(4))
                            }
                    }
                    cardField(label: "CVV", icon: nil) {
                        SecureField("•••", text: $cvv)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.center)
                            .font(.system(.body, design: .monospaced))
                            .onChange(of: cvv) { _, newVal in
                                cvv = String(newVal.filter(\.isNumber).prefix(4))
                            }
                    }
                }
            }

            Text("Kart bilgileriniz şifreli olarak iletilir ve cihazınızda saklanmaz.")
                .font(.caption2)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)

            applyButton(
                label: isSubmitting ? "Ödeme İşleniyor..." : "🔒 Ödemeyi Tamamla ve Başvur",
                icon: isSubmitting ? nil : nil,
                color: LinearGradient(colors: [.orange, Color(red: 0.9, green: 0.5, blue: 0)], startPoint: .leading, endPoint: .trailing),
                disabled: isSubmitting || !cardPaymentValid
            ) {
                Task { await submitApplication() }
            }

            Spacer(minLength: 30)
        }
    }

    // MARK: - Kart Önizleme
    private var cardPreview: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 18)
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.15, green: 0.15, blue: 0.35), Color(red: 0.3, green: 0.1, blue: 0.5)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(height: 110)
                .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)

            // Dekoratif daireler
            Circle()
                .fill(Color.white.opacity(0.06))
                .frame(width: 120, height: 120)
                .offset(x: 200, y: -30)
            Circle()
                .fill(Color.white.opacity(0.04))
                .frame(width: 80, height: 80)
                .offset(x: 240, y: 30)

            VStack(alignment: .leading, spacing: 10) {
                Text(cardNumber.isEmpty ? "•••• •••• •••• ••••" : cardNumber)
                    .font(.system(.title3, design: .monospaced))
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .tracking(2)

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("KART SAHİBİ").font(.system(size: 8, weight: .bold)).foregroundColor(.white.opacity(0.5))
                        Text(cardHolder.isEmpty ? "AD SOYAD" : cardHolder)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("SON KULLANMA").font(.system(size: 8, weight: .bold)).foregroundColor(.white.opacity(0.5))
                        Text("\(expiryMonth.isEmpty ? "MM" : expiryMonth)/\(expiryYear.isEmpty ? "YYYY" : expiryYear)")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(18)
        }
    }

    // MARK: - Card Field Builder
    @ViewBuilder
    private func cardField<Content: View>(label: String, icon: String?, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            if let icon {
                Label(label, systemImage: icon)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
            } else {
                Text(label)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
            }
            content()
                .padding(.horizontal, 14)
                .padding(.vertical, 13)
                .background(Color(UIColor.secondarySystemGroupedBackground))
                .cornerRadius(12)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.orange.opacity(0.25), lineWidth: 1))
        }
    }

    // MARK: - Apply Button
    private func applyButton<S: ShapeStyle>(label: String, icon: String?, color: S, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isSubmitting {
                    ProgressView().tint(.white)
                } else if let icon {
                    Image(systemName: icon)
                }
                Text(label).fontWeight(.bold)
            }
            .font(.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(color)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
        }
        .disabled(disabled)
        .opacity(disabled ? 0.6 : 1)
        .padding(.bottom, 4)
    }

    // MARK: - Submit
    private func submitApplication() async {
        guard let token = authManager.accessToken else {
            errorMessage = "Başvuru yapmak için giriş yapmanız gerekiyor."
            showErrorAlert = true
            return
        }
        isSubmitting = true

        let baseURL = Config.baseURL
        guard let url = URL(string: "\(baseURL)/events/\(event.id)/apply") else {
            errorMessage = "Geçersiz URL"
            showErrorAlert = true
            isSubmitting = false
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        var body: [String: Any] = [
            "motivation_letter": motivationLetter.isEmpty ? NSNull() : motivationLetter
        ]
        if isPaid {
            body["card_number"]      = cardNumber.filter(\.isNumber)
            body["card_holder_name"] = cardHolder
            body["expiry_month"]     = expiryMonth
            body["expiry_year"]      = expiryYear
            body["cvv"]              = cvv
        }

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                errorMessage = "Sunucu yanıt vermedi."
                showErrorAlert = true
                isSubmitting = false
                return
            }

            switch httpResponse.statusCode {
            case 201:
                showSuccessAlert = true
            case 401:
                errorMessage = "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın."
                showErrorAlert = true
            case 402:
                if let d = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let detail = d["detail"] as? String {
                    errorMessage = detail
                } else {
                    errorMessage = "Ödeme işlemi başarısız oldu."
                }
                showErrorAlert = true
            case 403:
                errorMessage = "Sadece gönüllüler etkinliklere başvurabilir."
                showErrorAlert = true
            case 404:
                errorMessage = "Etkinlik bulunamadı."
                showErrorAlert = true
            case 400:
                if let d = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let detail = d["detail"] as? String {
                    errorMessage = detail
                } else {
                    errorMessage = "Bu etkinlik başvuruya açık değil."
                }
                showErrorAlert = true
            case 409:
                errorMessage = "Bu etkinliğe zaten başvurdunuz."
                showErrorAlert = true
            default:
                if let d = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let detail = d["detail"] as? String {
                    errorMessage = detail
                } else {
                    errorMessage = "Bir hata oluştu. (Kod: \(httpResponse.statusCode))"
                }
                showErrorAlert = true
            }
        } catch {
            errorMessage = "Bağlantı hatası: \(error.localizedDescription)"
            showErrorAlert = true
        }

        isSubmitting = false
    }

    // MARK: - Helpers
    private func formatCardNumber(_ raw: String) -> String {
        let digits = raw.filter(\.isNumber).prefix(16)
        var result = ""
        for (i, ch) in digits.enumerated() {
            if i > 0 && i % 4 == 0 { result += " " }
            result.append(ch)
        }
        return result
    }

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) {
            let df = DateFormatter()
            df.locale = Locale(identifier: "tr_TR")
            df.dateStyle = .medium
            df.timeStyle = .short
            return df.string(from: date)
        }
        return isoString
    }
}

#Preview {
    NavigationStack {
        EventApplicationView(event: Event(
            id: "1",
            title: "Tatvan Sapur Doğa Yürüyüşü",
            description: nil,
            category: "hiking",
            difficulty: "easy",
            location_name: "Bitlis Tatvan",
            start_date: "2027-06-14T04:00:00Z",
            end_date: "2027-06-14T15:00:00Z",
            max_volunteers: 20,
            status: "open",
            created_by: "test-id",
            organization_id: nil,
            organization_name: "NG Dağcılık",
            organization_logo_url: nil,
            organizer_name: "Test",
            cover_photo_url: nil,
            fee: 150.0,
            is_free: false
        ))
        .environmentObject(AuthManager())
    }
}
