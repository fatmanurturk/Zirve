"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type ExperienceLevel = "beginner" | "intermediate" | "expert";
type EquipmentType = "helmet" | "crampon" | "rope" | "sleeping_bag" | "tent" | "harness" | "other";
type EquipmentCondition = "new" | "good" | "fair";

interface EquipmentItem {
    id: string;
    equipment_type: EquipmentType;
    condition: EquipmentCondition;
    brand: string;
}

export default function ProfileSetupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Profile Form State
    const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
    const [city, setCity] = useState("");
    const [maxAltitude, setMaxAltitude] = useState<string>("");
    const [bio, setBio] = useState("");
    const [emName, setEmName] = useState("");
    const [emPhone, setEmPhone] = useState("");

    // Equipment State
    const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
    const [eqType, setEqType] = useState<EquipmentType>("helmet");
    const [eqCondition, setEqCondition] = useState<EquipmentCondition>("good");
    const [eqBrand, setEqBrand] = useState("");

    const addEquipment = () => {
        setEquipmentList([
            ...equipmentList,
            {
                id: Math.random().toString(36).substring(7),
                equipment_type: eqType,
                condition: eqCondition,
                brand: eqBrand,
            },
        ]);
        setEqBrand(""); // Reset brand input
    };

    const removeEquipment = (id: string) => {
        setEquipmentList(equipmentList.filter((e) => e.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 1. Create Profile
            const emergency_contact = emName || emPhone ? { name: emName, phone: emPhone } : null;

            await api.post("/api/v1/volunteers/me/profile", {
                experience_level: experienceLevel,
                city: city || null,
                max_altitude_m: maxAltitude ? parseInt(maxAltitude) : null,
                bio: bio || null,
                emergency_contact,
            });

            // 2. Add Equipments
            if (equipmentList.length > 0) {
                // Run sequentially to avoid server overload, or Promise.all
                for (const eq of equipmentList) {
                    await api.post("/api/v1/volunteers/me/equipment", {
                        equipment_type: eq.equipment_type,
                        condition: eq.condition,
                        brand: eq.brand || null,
                    });
                }
            }

            // 3. Redirect to profile
            router.push("/profile");
            router.refresh(); // Refresh to fetch new profile data
        } catch (err: any) {
            setError(err.response?.data?.detail || "Profil oluşturulurken bir hata oluştu.");
            setLoading(false);
        }
    };

    const eqTypeLabels: Record<EquipmentType, string> = {
        helmet: "Kask",
        crampon: "Krampon",
        rope: "İp",
        sleeping_bag: "Uyku Tulumu",
        tent: "Çadır",
        harness: "Emniyet Kemeri (Harness)",
        other: "Diğer",
    };

    const eqConditionLabels: Record<EquipmentCondition, string> = {
        new: "Yeni",
        good: "İyi Durumda",
        fair: "Kullanılabilir",
    };

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Profilini Tamamla</h1>
                <p className="text-gray-500">
                    Etkinliklere katılabilmek için lütfen deneyim ve ekipman bilgilerini doldur.
                    Bu bilgiler seni doğru etkinliklerle eşleştirmemiz için önemlidir.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* KİŞİSEL BİLGİLER */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-5 border-b pb-3">Kişisel Bilgiler & Deneyim</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Deneyim Seviyeniz</label>
                            <select
                                value={experienceLevel}
                                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500"
                            >
                                <option value="beginner">Başlangıç (Temel doğa yürüyüşü)</option>
                                <option value="intermediate">Orta (Zorlu parkur ve kampçılık)</option>
                                <option value="expert">Uzman (Teknik tırmanış ve rehberlik)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bulunduğunuz Şehir</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Örn: Ankara"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Çıktığınız Max. İrtifa (Metre)</label>
                            <input
                                type="number"
                                value={maxAltitude}
                                onChange={(e) => setMaxAltitude(e.target.value)}
                                placeholder="Örn: 3000"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kendinden Bahset (Biyografi)</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={3}
                                placeholder="Doğa sporları geçmişin, katıldığın etkinlikler vs."
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>
                </div>

                {/* ACİL DURUM KİŞİSİ */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-5 border-b pb-3">Acil Durum Kişisi</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Adı Soyadı</label>
                            <input
                                type="text"
                                value={emName}
                                onChange={(e) => setEmName(e.target.value)}
                                placeholder="Örn: Ali Yılmaz"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
                            <input
                                type="tel"
                                value={emPhone}
                                onChange={(e) => setEmPhone(e.target.value)}
                                placeholder="Örn: +90 555 123 4567"
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>
                </div>

                {/* EKİPMANLAR */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Ekipmanlar (Opsiyonel)</h2>
                    <p className="text-sm text-gray-500 mb-5 border-b pb-3">Sahip olduğunuz kamp veya tırmanış ekipmanlarını buraya ekleyebilirsiniz.</p>

                    {/* Ekli Ekipmanlar Listesi */}
                    {equipmentList.length > 0 && (
                        <div className="mb-6 space-y-2">
                            {equipmentList.map((eq) => (
                                <div key={eq.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg">
                                    <div>
                                        <span className="font-medium text-gray-800 text-sm">{eqTypeLabels[eq.equipment_type]}</span>
                                        <span className="text-gray-400 text-xs mx-2">•</span>
                                        <span className="text-gray-600 text-sm">{eqConditionLabels[eq.condition]}</span>
                                        {eq.brand && (
                                            <>
                                                <span className="text-gray-400 text-xs mx-2">•</span>
                                                <span className="text-gray-500 text-sm">{eq.brand}</span>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeEquipment(eq.id)}
                                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                                    >
                                        Sil
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Yeni Ekipman Ekleme Formu (Inline) */}
                    <div className="flex flex-col md:flex-row gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="w-full">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Ekipman Tipi</label>
                            <select
                                value={eqType}
                                onChange={(e) => setEqType(e.target.value as EquipmentType)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                {Object.entries(eqTypeLabels).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Durumu</label>
                            <select
                                value={eqCondition}
                                onChange={(e) => setEqCondition(e.target.value as EquipmentCondition)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                {Object.entries(eqConditionLabels).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Marka/Model (Opsiyonel)</label>
                            <input
                                type="text"
                                value={eqBrand}
                                onChange={(e) => setEqBrand(e.target.value)}
                                placeholder="Örn: Petzl"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addEquipment}
                            className="w-full md:w-auto px-5 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition whitespace-nowrap"
                        >
                            + Ekle
                        </button>
                    </div>
                </div>

                {/* GÖNDER */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-green-700 text-white px-8 py-3 rounded-xl font-medium hover:bg-green-800 transition shadow-sm disabled:opacity-50"
                    >
                        {loading ? "Kaydediliyor..." : "Profili Tamamla ve Kaydet"}
                    </button>
                </div>
            </form>
        </div>
    );
}
