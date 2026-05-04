import SwiftUI

struct ClubSetupView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var name = ""
    @State private var city = ""
    @State private var category = ""
    @State private var description = ""
    @State private var website = ""
    @State private var logoUrl = ""
    @State private var tagsString = ""
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    let categories = [
        ("mountaineering", "Dağcılık"),
        ("trekking", "Doğa Yürüyüşü"),
        ("environment", "Çevre Koruma"),
        ("search_rescue", "Arama Kurtarma"),
        ("other", "Diğer")
    ]
    
    var isUpdate: Bool {
        authManager.organization != nil
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Kulüp Bilgileri")) {
                    TextField("Kulüp Adı *", text: $name)
                    TextField("Şehir", text: $city)
                    
                    Picker("Kategori", selection: $category) {
                        Text("Seçiniz").tag("")
                        ForEach(categories, id: \.0) { cat in
                            Text(cat.1).tag(cat.0)
                        }
                    }
                }
                
                Section(header: Text("Detaylar")) {
                    ZStack(alignment: .topLeading) {
                        if description.isEmpty {
                            Text("Kulüp Açıklaması")
                                .foregroundColor(.gray.opacity(0.5))
                                .padding(.top, 8)
                                .padding(.leading, 4)
                        }
                        TextEditor(text: $description)
                            .frame(minHeight: 100)
                    }
                    
                    TextField("Website URL", text: $website)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                    
                    TextField("Logo URL", text: $logoUrl)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                    
                    TextField("Etiketler (virgülle ayırın)", text: $tagsString)
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.footnote)
                    }
                }
                
                Section {
                    Button(action: saveAction) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .padding(.trailing, 8)
                            }
                            Text(isUpdate ? "Değişiklikleri Kaydet" : "Kulübü Kur")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(name.isEmpty || isLoading)
                    .foregroundColor(.white)
                    .listRowBackground(name.isEmpty ? Color.gray : Color(red: 0.2, green: 0.5, blue: 0.2))
                }
            }
            .navigationTitle(isUpdate ? "Kulüp Düzenle" : "Kulüp Kurulumu")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if isUpdate {
                        Button("İptal") { dismiss() }
                    }
                }
            }
            .onAppear {
                if let org = authManager.organization {
                    name = org.name
                    city = org.city ?? ""
                    category = org.category ?? ""
                    description = org.description ?? ""
                    website = org.website ?? ""
                    logoUrl = org.logo_url ?? ""
                    tagsString = org.tags.joined(separator: ", ")
                }
            }
        }
    }
    
    private func saveAction() {
        isLoading = true
        errorMessage = nil
        
        let tags = tagsString.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        
        Task {
            let success = await authManager.createOrUpdateOrganization(
                name: name,
                description: description.isEmpty ? nil : description,
                logoUrl: logoUrl.isEmpty ? nil : logoUrl,
                website: website.isEmpty ? nil : website,
                city: city.isEmpty ? nil : city,
                category: category.isEmpty ? nil : category,
                tags: tags
            )
            
            isLoading = false
            if success {
                dismiss()
            } else {
                errorMessage = "Bir hata oluştu. Lütfen tekrar deneyin."
            }
        }
    }
}

#Preview {
    ClubSetupView()
        .environmentObject(AuthManager())
}
