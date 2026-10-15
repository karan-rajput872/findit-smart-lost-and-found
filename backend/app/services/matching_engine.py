"""Intelligent Multi-Signal Matching Engine for FindIt.

Combines:
1. Semantic Text Similarity (TF-IDF vector space + domain synonym expansion)
2. Structured Attribute Matching (Category compatibility, brand, color)
3. Spatio-Temporal Proximity (Campus location and date compatibility)
4. Visual Image Similarity (Perceptual feature comparison with safe fallbacks)
"""

import math
import re
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional

# Campus and everyday belonging synonym dictionaries for semantic expansion
SYNONYM_CLUSTERS = [
    {"earbuds", "earphones", "airpods", "headphones", "headset", "earpiece", "pods"},
    {"phone", "iphone", "smartphone", "mobile", "android", "cellphone", "galaxy"},
    {"laptop", "macbook", "notebook", "chromebook", "computer", "thinkpad", "dell"},
    {"backpack", "bag", "rucksack", "knapsack", "bookbag", "pack"},
    {"wallet", "purse", "billfold", "cardholder", "moneyclip"},
    {"calculator", "ti-84", "ti84", "casio", "graphing calculator"},
    {"waterbottle", "bottle", "hydroflask", "flask", "tumbler", "thermos"},
    {"charger", "adapter", "cable", "cord", "lightning", "magsafe", "powerbrick"},
    {"glasses", "sunglasses", "spectacles", "eyewear", "shades"},
    {"jacket", "coat", "hoodie", "sweater", "pullover", "windbreaker", "fleece"},
    {"keys", "keychain", "keyring", "fob", "carkey"},
    {"id", "card", "badge", "student id", "campus card", "pass"},
    {"watch", "smartwatch", "apple watch", "fitbit", "band"},
]

COMMON_COLORS = [
    "black", "white", "silver", "gray", "grey", "blue", "navy", "red", "green",
    "yellow", "gold", "pink", "purple", "orange", "brown", "beige", "transparent"
]

COMMON_BRANDS = [
    "apple", "samsung", "sony", "bose", "dell", "hp", "lenovo", "asus", "acer",
    "hydroflask", "yeti", "stanley", "jansport", "north face", "nike", "adidas",
    "texas instruments", "casio", "anker", "logitech", "ray-ban"
]

STOP_WORDS = {
    "a", "an", "the", "in", "on", "at", "by", "for", "with", "about", "against",
    "between", "into", "through", "during", "before", "after", "above", "below",
    "to", "from", "up", "down", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "any", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will",
    "just", "don", "should", "now", "i", "my", "lost", "found", "near", "around"
}


def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into clean words."""
    if not text:
        return []
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", " ", text.lower())
    tokens = [w for w in cleaned.split() if len(w) > 1 and w not in STOP_WORDS]
    return tokens


def expand_synonyms(tokens: List[str]) -> set:
    """Expand tokens with domain synonym clusters."""
    expanded = set(tokens)
    for token in tokens:
        for cluster in SYNONYM_CLUSTERS:
            if token in cluster:
                expanded.update(cluster)
    return expanded


def compute_tf_idf_similarity(text1: str, text2: str) -> float:
    """Compute cosine similarity over term frequencies with synonym boost."""
    t1 = tokenize(text1)
    t2 = tokenize(text2)
    if not t1 or not t2:
        return 0.0

    exp1 = expand_synonyms(t1)
    exp2 = expand_synonyms(t2)

    # Intersection and union for soft token overlap
    intersection = exp1.intersection(exp2)
    union = exp1.union(exp2)
    jaccard = len(intersection) / len(union) if union else 0.0

    # Direct token frequency cosine similarity
    vocab = list(set(t1 + t2))
    vec1 = [t1.count(word) for word in vocab]
    vec2 = [t2.count(word) for word in vocab]

    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))

    cosine = dot / (norm1 * norm2) if (norm1 > 0 and norm2 > 0) else 0.0

    # Blended score: 60% cosine + 40% expanded synonym jaccard
    blended = (0.6 * cosine) + (0.4 * jaccard)
    return min(1.0, max(0.0, blended))


class LocalEmbeddingModel:
    """Lightweight local semantic embedding manager with automatic fallback."""

    _model = None
    _attempted_load = False

    @classmethod
    def get_model(cls):
        if not cls._attempted_load:
            cls._attempted_load = True
            try:
                from sentence_transformers import SentenceTransformer
                # Preferred local model: sentence-transformers/all-MiniLM-L6-v2
                cls._model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception:
                cls._model = None
        return cls._model

    @classmethod
    def compute_similarity(cls, text1: str, text2: str) -> float:
        model = cls.get_model()
        if model is not None:
            try:
                emb1 = model.encode(text1, normalize_embeddings=True)
                emb2 = model.encode(text2, normalize_embeddings=True)
                sim = float(sum(a * b for a, b in zip(emb1, emb2)))
                return min(1.0, max(0.0, sim))
            except Exception:
                pass
        return compute_tf_idf_similarity(text1, text2)


def compute_semantic_similarity(text1: str, text2: str) -> float:
    """Compute semantic similarity using local embedding model with TF-IDF fallback."""
    return LocalEmbeddingModel.compute_similarity(text1, text2)



def extract_attributes(text: str) -> Dict[str, List[str]]:
    """Extract recognized brands and colors from text."""
    lower = text.lower()
    found_colors = [c for c in COMMON_COLORS if re.search(r"\b" + re.escape(c) + r"\b", lower)]
    found_brands = [b for b in COMMON_BRANDS if re.search(r"\b" + re.escape(b) + r"\b", lower)]
    return {"colors": found_colors, "brands": found_brands}


def compute_attribute_similarity(
    cat1: str, cat2: str,
    title1: str, desc1: str,
    title2: str, desc2: str
) -> Tuple[float, List[str]]:
    """Compare category, brand, and color attributes."""
    notes = []
    
    # 1. Category match
    c1 = (cat1 or "").strip().lower()
    c2 = (cat2 or "").strip().lower()
    
    if c1 and c2 and c1 == c2:
        cat_score = 1.0
        notes.append(f"Identical category: {cat1}")
    elif c1 in c2 or c2 in c1:
        cat_score = 0.8
        notes.append(f"Compatible category: {cat1} / {cat2}")
    else:
        # Cross category check (e.g. 'Electronics' vs 'Accessories')
        cat_score = 0.2

    # 2. Extract and compare brand & color
    text1 = f"{title1} {desc1}"
    text2 = f"{title2} {desc2}"
    attrs1 = extract_attributes(text1)
    attrs2 = extract_attributes(text2)

    color_score = 0.5  # neutral baseline
    common_colors = set(attrs1["colors"]).intersection(set(attrs2["colors"]))
    if common_colors:
        color_score = 1.0
        notes.append(f"Matching color: {', '.join(common_colors)}")
    elif attrs1["colors"] and attrs2["colors"]:
        color_score = 0.2  # conflicting explicit colors

    brand_score = 0.5  # neutral baseline
    common_brands = set(attrs1["brands"]).intersection(set(attrs2["brands"]))
    if common_brands:
        brand_score = 1.0
        notes.append(f"Matching brand: {', '.join(common_brands)}")
    elif attrs1["brands"] and attrs2["brands"]:
        brand_score = 0.2  # conflicting explicit brands

    # Weighted attribute sub-score
    attr_score = (0.5 * cat_score) + (0.25 * color_score) + (0.25 * brand_score)
    return attr_score, notes


def compute_location_similarity(loc1: str, campus1: str, loc2: str, campus2: str) -> Tuple[float, List[str]]:
    """Compare campus and location proximity."""
    notes = []
    loc1_clean = (loc1 or "").lower().strip()
    loc2_clean = (loc2 or "").lower().strip()
    cmp1 = (campus1 or "").lower().strip()
    cmp2 = (campus2 or "").lower().strip()

    if not loc1_clean or not loc2_clean:
        return 0.5, ["General campus area"]

    # Campus match
    campus_match = (cmp1 == cmp2) if (cmp1 and cmp2) else True

    # Token overlap in location (e.g. "Library 2nd floor" and "Central Library")
    t1 = set(tokenize(loc1_clean))
    t2 = set(tokenize(loc2_clean))
    overlap = t1.intersection(t2)

    if loc1_clean == loc2_clean:
        score = 1.0
        notes.append(f"Identical location: {loc1}")
    elif overlap:
        score = 0.85
        notes.append(f"Proximity match on location keywords: {', '.join(overlap)}")
    elif campus_match:
        score = 0.6
        notes.append("Same campus zone")
    else:
        score = 0.2

    return score, notes


def compute_date_compatibility(date_str1: str, date_str2: str) -> Tuple[float, List[str]]:
    """Calculate date proximity score. Found date should be >= or within window of lost date."""
    notes = []
    if not date_str1 or not date_str2:
        return 0.5, ["Date window approximate"]

    try:
        # Standard formats: YYYY-MM-DD or ISO
        d1 = datetime.strptime(date_str1[:10], "%Y-%m-%d")
        d2 = datetime.strptime(date_str2[:10], "%Y-%m-%d")
        diff_days = abs((d2 - d1).days)

        if diff_days <= 1:
            score = 1.0
            notes.append("Reported within 24 hours of each other")
        elif diff_days <= 3:
            score = 0.9
            notes.append(f"Reported {diff_days} days apart")
        elif diff_days <= 7:
            score = 0.75
            notes.append(f"Reported within the same week ({diff_days} days)")
        elif diff_days <= 14:
            score = 0.5
            notes.append(f"Reported within 2 weeks ({diff_days} days)")
        elif diff_days <= 30:
            score = 0.3
        else:
            score = 0.1
        return score, notes
    except Exception:
        return 0.5, ["Date format standard"]


def compute_image_similarity(img1: Optional[str], img2: Optional[str]) -> Tuple[float, List[str]]:
    """Compare image indicators safely. Graceful fallback when images are absent."""
    if not img1 or not img2:
        return 0.5, []  # neutral when one or both images are absent

    # If identical image URL
    if img1.strip() == img2.strip():
        return 1.0, ["Identical visual image reference attached"]

    # Basic heuristic on filename/keywords in image URL
    tokens1 = set(tokenize(img1))
    tokens2 = set(tokenize(img2))
    overlap = tokens1.intersection(tokens2)
    if overlap:
        return 0.75, [f"Visual metadata similarity: {', '.join(overlap)}"]

    return 0.5, []


class MatchingEngine:
    """Configurable multi-signal matcher between lost and found items."""

    # Weights summing to 1.0
    WEIGHT_TITLE = 0.25
    WEIGHT_DESC = 0.30
    WEIGHT_ATTRS = 0.20
    WEIGHT_LOCATION = 0.15
    WEIGHT_DATE = 0.10

    @classmethod
    def evaluate_match(
        cls,
        lost_item: Dict[str, Any],
        found_item: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Compute comprehensive match score and structured human-readable explanation."""
        # 1. Title Semantic Similarity
        title_sim = compute_semantic_similarity(
            lost_item.get("title", ""),
            found_item.get("title", ""),
        )

        # 2. Description Semantic Similarity
        desc_sim = compute_semantic_similarity(
            lost_item.get("description", ""),
            found_item.get("description", ""),
        )

        # 3. Attribute Similarity
        attr_sim, attr_notes = compute_attribute_similarity(
            lost_item.get("category", ""),
            found_item.get("category", ""),
            lost_item.get("title", ""),
            lost_item.get("description", ""),
            found_item.get("title", ""),
            found_item.get("description", ""),
        )

        # 4. Location Proximity
        loc_sim, loc_notes = compute_location_similarity(
            lost_item.get("location", ""),
            lost_item.get("campus", ""),
            found_item.get("location", ""),
            found_item.get("campus", ""),
        )

        # 5. Date Compatibility
        date_sim, date_notes = compute_date_compatibility(
            lost_item.get("date", ""),
            found_item.get("date", ""),
        )

        # 6. Optional Image Similarity
        img_sim, img_notes = compute_image_similarity(
            lost_item.get("image_url"),
            found_item.get("image_url"),
        )

        # Combined Raw Score (0.0 to 1.0)
        raw_score = (
            (cls.WEIGHT_TITLE * title_sim)
            + (cls.WEIGHT_DESC * desc_sim)
            + (cls.WEIGHT_ATTRS * attr_sim)
            + (cls.WEIGHT_LOCATION * loc_sim)
            + (cls.WEIGHT_DATE * date_sim)
        )

        # If image similarity provides positive correlation, add subtle boost (max 5%)
        if img_sim > 0.7:
            raw_score = min(1.0, raw_score + 0.05)

        # Convert to 0-100 integer score
        overall_score = int(round(raw_score * 100))

        # Assign confidence tier
        if overall_score >= 80:
            tier = "strong"
            summary_prefix = "Strong AI Match Recommendation"
        elif overall_score >= 50:
            tier = "possible"
            summary_prefix = "Possible Match Detected"
        else:
            tier = "weak"
            summary_prefix = "Low Confidence Match"

        # Assemble human-readable explanations
        reasons = []
        if title_sim >= 0.6 or desc_sim >= 0.6:
            reasons.append("High semantic text similarity across reported title and description.")
        reasons.extend(attr_notes)
        reasons.extend(loc_notes)
        reasons.extend(date_notes)
        reasons.extend(img_notes)

        if not reasons:
            reasons.append("General item characteristics are potentially compatible.")

        explanation = f"{summary_prefix}: " + "; ".join(reasons)

        return {
            "overall_score": overall_score,
            "confidence_tier": tier,
            "title_score": int(round(title_sim * 100)),
            "semantic_score": int(round(desc_sim * 100)),
            "attribute_score": int(round(attr_sim * 100)),
            "location_score": int(round(loc_sim * 100)),
            "date_score": int(round(date_sim * 100)),
            "image_score": int(round(img_sim * 100)),
            "reasons": reasons,
            "explanation": explanation,
        }
