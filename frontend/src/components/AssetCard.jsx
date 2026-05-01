import { useState } from "react";
import { MapPin, Users, Leaf, Accessibility, Utensils, Wifi, Check, Loader2, Projector } from "lucide-react";

export default function AssetCard({ match, onBook, booking = false, disabled = false }) {
  const asset = match.asset || {};
  const accessibility = asset.accessibility || {};
  const amenities = asset.amenities || {};
  const [imgError, setImgError] = useState(false);

  const accessLabel = {
    full: "Fully accessible",
    partial: "Partially accessible",
    none: "Limited access",
  }[match.accessibility_match] || "";

  const accessColor = {
    full: "bg-emerald-50 text-emerald-700 border-emerald-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    none: "bg-gray-100 text-gray-600 border-gray-200",
  }[match.accessibility_match] || "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#2A5C5A] hover:shadow-md transition group">
      <div className="flex flex-col sm:flex-row gap-0">
        {/* Image */}
        <div className="w-full h-36 sm:w-36 sm:h-auto sm:min-h-[160px] flex-shrink-0 relative overflow-hidden">
          {asset.image_url && !imgError ? (
            <img
              src={asset.image_url}
              alt={asset.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#EAF2F1] flex items-center justify-center">
              <MapPin size={32} className="text-[#2A5C5A]" strokeWidth={1.5} />
            </div>
          )}
          {/* Category badge over image */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
            <div className="text-white text-[9px] uppercase tracking-wide font-semibold truncate">
              {asset.category?.replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 leading-snug">{asset.name}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span className="flex items-center gap-1"><MapPin size={11} />{asset.ward}</span>
                <span className="flex items-center gap-1"><Users size={11} />Up to {asset.capacity}</span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-[10px] text-gray-400">Match</div>
              <div className="text-xl font-bold text-[#2A5C5A]">{match.match_score}<span className="text-xs font-normal text-gray-400">/100</span></div>
            </div>
          </div>

          <p className="text-xs text-gray-600 italic mb-2.5 leading-relaxed line-clamp-2">
            {match.reasoning}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {accessLabel && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${accessColor}`}>
                <Accessibility size={9} />{accessLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              <Leaf size={9} />{match.carbon_estimate_kg} kg CO₂
            </span>
            {amenities.kitchen && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                <Utensils size={9} />Kitchen
              </span>
            )}
            {amenities.wifi && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border bg-[#EAF2F1] text-[#2A5C5A] border-[#2A5C5A]/20">
                <Wifi size={9} />WiFi
              </span>
            )}
          </div>

          <button
            onClick={() => !disabled && onBook(asset)}
            disabled={disabled}
            className="px-4 py-1.5 bg-[#2A5C5A] text-white rounded-lg text-xs font-semibold hover:bg-[#2A5C5A]/90 disabled:opacity-60 disabled:cursor-not-allowed transition inline-flex items-center gap-1.5"
          >
            {booking ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {booking ? "Holding…" : "Book this space"}
          </button>
        </div>
      </div>
    </div>
  );
}
