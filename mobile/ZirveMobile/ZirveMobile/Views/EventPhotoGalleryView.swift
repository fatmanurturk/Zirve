// filepath: mobile/ZirveMobile/ZirveMobile/Views/EventPhotoGalleryView.swift
import SwiftUI

struct EventPhotoGalleryView: View {
    let photos: [EventPhoto]
    @State private var selectedPhoto: EventPhoto? = nil
    
    let baseUrl = "http://127.0.0.1:8000" // Backend URL
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Etkinlik Galerisi")
                .font(.headline)
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(photos) { photo in
                        AsyncImage(url: URL(string: "\(baseUrl)/uploads/\(photo.file_path)")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Color.gray.opacity(0.2)
                        }
                        .frame(width: 150, height: 150)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            VStack {
                                if photo.is_cover {
                                    Text("KAPAK")
                                        .font(.system(size: 10, weight: .bold))
                                        .padding(4)
                                        .background(Color.blue)
                                        .foregroundColor(.white)
                                        .cornerRadius(4)
                                        .padding(8)
                                }
                                Spacer()
                            },
                            alignment: .topLeading
                        )
                        .onTapGesture {
                            selectedPhoto = photo
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
        .fullScreenCover(item: $selectedPhoto) { photo in
            FullScreenPhotoView(photo: photo, baseUrl: baseUrl)
        }
    }
}

struct FullScreenPhotoView: View {
    let photo: EventPhoto
    let baseUrl: String
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            AsyncImage(url: URL(string: "\(baseUrl)/uploads/\(photo.file_path)")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                ProgressView()
                    .tint(.white)
            }
            
            VStack {
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white)
                            .padding()
                    }
                }
                Spacer()
                if let caption = photo.caption {
                    Text(caption)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.black.opacity(0.6))
                        .cornerRadius(10)
                        .padding(.bottom, 40)
                }
            }
        }
    }
}
