// filepath: mobile/ZirveMobile/ZirveMobile/Views/PhotoUploaderView.swift
import SwiftUI
import PhotosUI

struct PhotoUploaderView: View {
    let eventId: UUID
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var selectedImages: [UIImage] = []
    @State private var isUploading = false
    @State private var uploadProgress: Double = 0
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var errorMessage: String?
    
    var body: some View {
        VStack {
            Text("Fotoğraf Yükle")
                .font(.title2)
                .bold()
                .padding()
            
            Text("En fazla 8 fotoğraf seçebilirsiniz.")
                .font(.caption)
                .foregroundColor(.secondary)
            
            ScrollView(.horizontal) {
                HStack {
                    ForEach(selectedImages, id: \.self) { image in
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 100, height: 100)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                .padding()
            }
            
            PhotosPicker(selection: $selectedItems, maxSelectionCount: 8, matching: .images) {
                Label("Fotoğraf Seç", systemImage: "photo.on.rectangle.angled")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .padding()
            }
            .onChange(of: selectedItems) { newItem in
                Task {
                    selectedImages.removeAll()
                    for item in selectedItems {
                        if let data = try? await item.loadTransferable(type: Data.self),
                           let image = UIImage(data: data) {
                            selectedImages.append(image)
                        }
                    }
                }
            }
            
            if !selectedImages.isEmpty {
                Button {
                    uploadPhotos()
                } label: {
                    if isUploading {
                        ProgressView(value: uploadProgress)
                            .progressViewStyle(.linear)
                            .frame(width: 200)
                    } else {
                        Text("\(selectedImages.count) Fotoğrafı Yükle")
                            .bold()
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                            .padding()
                    }
                }
                .disabled(isUploading)
            }
            
            if let error = errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
                    .padding()
            }

            Spacer()
        }
        .padding()
    }

    func uploadPhotos() {
        guard let token = authManager.accessToken else {
            errorMessage = "Oturum bulunamadı."
            return
        }

        isUploading = true
        errorMessage = nil
        uploadProgress = 0

        Task {
            let total = Double(selectedImages.count)
            var current = 0.0

            for image in selectedImages {
                guard let imageData = image.jpegData(compressionQuality: 0.7) else { continue }
                
                let success = await uploadSinglePhoto(data: imageData, token: token)
                if success {
                    current += 1.0
                    uploadProgress = current / total
                } else {
                    errorMessage = "Bazı fotoğraflar yüklenemedi."
                    break
                }
            }

            if errorMessage == nil {
                selectedImages.removeAll()
                selectedItems.removeAll()
                dismiss()
            }
            isUploading = false
        }
    }

    func uploadSinglePhoto(data: Data, token: String) async -> Bool {
        let url = URL(string: "http://localhost:8000/api/v1/event-photos/\(eventId.uuidString.lowercased())")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body

        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                return true
            }
        } catch {
            print("Upload error: \(error)")
        }
        return false
    }
}
