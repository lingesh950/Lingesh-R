"""
=============================================================================
SMART CAMPUS SAFETY & EMERGENCY ALERT SYSTEM - AI PRIORITY MODULE (STEP 2)
=============================================================================
Hybrid emergency classification engine:
1. Rule-based keyword matching & free-text detection (Primary / High Priority)
2. Machine Learning fallback (Scikit-Learn TF-IDF + Logistic Regression)
"""

import re
from typing import Dict, Any, Tuple

# Built-in ML Training Dataset (Type inference and priority modeling)
TRAINING_DATA = [
    # Medical serious
    ("I cannot breathe and need oxygen urgently", "Medical", "HIGH"),
    ("Student is unconscious on the classroom floor", "Medical", "HIGH"),
    ("Heavy bleeding from a broken glass cut in chemistry lab", "Medical", "HIGH"),
    ("Person collapsed and is not responding to calls", "Medical", "HIGH"),
    ("Sharp chest pain and shortness of breath", "Medical", "HIGH"),
    ("Someone having a seizure near the hostel staircase", "Medical", "HIGH"),
    # Medical other
    ("I scraped my knee and feel dizzy in the gymnasium", "Medical", "MEDIUM"),
    ("Sprained my ankle while walking down stairs", "Medical", "MEDIUM"),
    ("Feeling slight nausea and headache in library", "Medical", "MEDIUM"),
    ("Minor burn from hot water kettle in dorm", "Medical", "MEDIUM"),
    # Fire
    ("Huge fire broke out in the cafeteria kitchen", "Fire", "HIGH"),
    ("Smoke coming from the electrical panel in room 204", "Fire", "HIGH"),
    ("Heard an explosion and saw flames in biology lab", "Fire", "HIGH"),
    ("Fire alarm ringing and smell of smoke in corridor", "Fire", "HIGH"),
    # Security serious
    ("Person carrying a weapon near campus west gate", "Security", "HIGH"),
    ("Someone saw a gun near the administrative block", "Security", "HIGH"),
    ("Individual brandishing a knife in the park", "Security", "HIGH"),
    ("Physical attack and assault taking place in parking lot", "Security", "HIGH"),
    ("Someone is following me closely near the dark parking area", "Security", "HIGH"),
    ("A stranger threatened me with violence", "Security", "HIGH"),
    # Security other
    ("Suspicious individual wandering around locked building", "Security", "MEDIUM"),
    ("Vandalism noticed on student notice board", "Security", "MEDIUM"),
    ("Someone attempting to open locked car doors", "Security", "MEDIUM"),
    ("Unidentified person refusing to show campus ID badge", "Security", "MEDIUM"),
    # Lost items / Minor
    ("I lost my student ID card near the main cafeteria", "Other", "LOW"),
    ("Misplaced my wallet and dorm room keys", "Other", "LOW"),
    ("Lost my phone in lecture hall 3B", "Other", "LOW"),
    ("Noise complaint regarding loud music in nearby room", "Other", "LOW"),
    ("Water leakage in washroom sink", "Other", "LOW"),
    # Other general
    ("General campus maintenance query about air conditioning", "Other", "MEDIUM"),
    ("Need information regarding campus shuttle timing", "Other", "MEDIUM"),
]

# Initialize and train optional Scikit-Learn Model
ml_pipeline = None
ml_initialized = False

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline

    texts = [item[0] for item in TRAINING_DATA]
    labels = [f"{item[1]}|{item[2]}" for item in TRAINING_DATA]

    ml_pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english", min_df=1)),
        ("clf", LogisticRegression(max_iter=200, random_state=42))
    ])
    ml_pipeline.fit(texts, labels)
    ml_initialized = True
    print("[AI Priority] Scikit-Learn TF-IDF + LogisticRegression model trained successfully.")
except Exception as ml_err:
    print(f"[AI Priority] ML module fallback active (rules take precedence): {ml_err}")
    ml_pipeline = None
    ml_initialized = False


# =============================================================================
# KEYWORD DICTIONARIES
# =============================================================================

FIRE_KEYWORDS = [
    "fire", "flame", "flames", "smoke", "explosion", "exploding",
    "burning", "blaze", "fire alarm"
]

MEDICAL_SERIOUS_KEYWORDS = [
    "difficulty breathing", "breathing", "unconscious", "bleeding",
    "chest pain", "seizure", "collapsed", "not responding"
]

MEDICAL_GENERAL_KEYWORDS = [
    "medical", "injured", "injury", "hurt", "dizzy", "dizziness",
    "fainted", "headache", "vomiting", "nausea", "sprain", "fracture",
    "ambulance", "doctor", "first aid", "pain", "allergic", "allergy"
]

SECURITY_SERIOUS_KEYWORDS = [
    "weapon", "gun", "knife", "attack", "assault", "following",
    "followed", "threat", "threatened", "danger"
]

SECURITY_GENERAL_KEYWORDS = [
    "security", "stalking", "stalker", "harass", "harassment", "fight",
    "fighting", "robbery", "theft", "thief", "stolen", "break-in",
    "trespassing", "intruder", "suspicious", "stranger"
]

LOST_AND_MINOR_KEYWORDS = [
    "lost item", "lost phone", "lost id", "minor issue", "small issue",
    "lost", "misplaced", "wallet", "id card", "keys", "key", "phone",
    "bag", "backpack", "minor", "noise", "item", "items", "headphones",
    "glasses", "laptop", "cable", "bottle", "umbrella"
]


def classify_emergency(type_input: str, message: str = "") -> Dict[str, Any]:
    """
    Classifies emergency type, calculates priority, and generates response protocol.

    Rules:
    - Fire: HIGH -> "Immediate fire/security response"
    - Medical serious: HIGH -> "Immediate medical assistance"
    - Other Medical: MEDIUM -> "Medical team assistance"
    - Security serious: HIGH -> "Immediate security intervention"
    - Other Security: MEDIUM -> "Security team assistance"
    - Lost items/minor issues: LOW -> "Routine assistance"
    - Other: MEDIUM -> "Campus team assistance"

    Returns:
    {
        "emergency_type": "Medical" | "Security" | "Fire" | "Other",
        "priority": "HIGH" | "MEDIUM" | "LOW",
        "recommended_response": "..."
    }
    """
    raw_type = (type_input or "").strip()
    raw_msg = (message or "").strip()
    msg_lower = raw_msg.lower()
    type_lower = raw_type.lower()
    combined_lower = f"{type_lower} {msg_lower}".strip()

    # Normalize declared type
    normalized_type = "Other"
    if "fire" in type_lower:
        normalized_type = "Fire"
    elif "med" in type_lower:
        normalized_type = "Medical"
    elif "sec" in type_lower:
        normalized_type = "Security"

    # Helper for substring / whole-word matching
    def contains_phrase(text: str, phrase: str) -> bool:
        pattern = r"(?:^|\W)" + re.escape(phrase.lower()) + r"(?:$|\W)"
        return bool(re.search(pattern, text))

    # -------------------------------------------------------------------------
    # RULE-BASED CLASSIFICATION (HIGHEST PRIORITY)
    # -------------------------------------------------------------------------

    # 1. Fire Rules
    has_fire_kw = any(contains_phrase(combined_lower, k) for k in FIRE_KEYWORDS)
    if normalized_type == "Fire" or has_fire_kw:
        return {
            "emergency_type": "Fire",
            "priority": "HIGH",
            "recommended_response": "Immediate fire/security response",
        }

    # 2. Serious Medical Keywords
    has_med_serious = any(contains_phrase(combined_lower, k) for k in MEDICAL_SERIOUS_KEYWORDS)
    if has_med_serious:
        return {
            "emergency_type": "Medical",
            "priority": "HIGH",
            "recommended_response": "Immediate medical assistance",
        }

    # 3. Serious Security Keywords
    has_sec_serious = any(contains_phrase(combined_lower, k) for k in SECURITY_SERIOUS_KEYWORDS)
    if has_sec_serious:
        return {
            "emergency_type": "Security",
            "priority": "HIGH",
            "recommended_response": "Immediate security intervention",
        }

    # 4. Lost items / Minor issues -> LOW
    has_lost_minor = any(contains_phrase(combined_lower, k) for k in LOST_AND_MINOR_KEYWORDS)
    if has_lost_minor and not has_med_serious and not has_sec_serious:
        return {
            "emergency_type": normalized_type if normalized_type != "Other" else "Other",
            "priority": "LOW",
            "recommended_response": "Routine assistance",
        }

    # 5. Free-text Medical Inference
    has_med_general = any(contains_phrase(combined_lower, k) for k in MEDICAL_GENERAL_KEYWORDS)
    if normalized_type == "Medical" or has_med_general:
        return {
            "emergency_type": "Medical",
            "priority": "MEDIUM",
            "recommended_response": "Medical team assistance",
        }

    # 6. Free-text Security Inference
    has_sec_general = any(contains_phrase(combined_lower, k) for k in SECURITY_GENERAL_KEYWORDS)
    if normalized_type == "Security" or has_sec_general:
        return {
            "emergency_type": "Security",
            "priority": "MEDIUM",
            "recommended_response": "Security team assistance",
        }

    # -------------------------------------------------------------------------
    # OPTIONAL ML PREDICTION FALLBACK (If keywords are ambiguous and text exists)
    # -------------------------------------------------------------------------
    if ml_initialized and ml_pipeline is not None and len(raw_msg.split()) >= 3:
        try:
            prediction = ml_pipeline.predict([raw_msg])[0]
            pred_type, pred_priority = prediction.split("|")
            responses = {
                ("Fire", "HIGH"): "Immediate fire/security response",
                ("Medical", "HIGH"): "Immediate medical assistance",
                ("Medical", "MEDIUM"): "Medical team assistance",
                ("Security", "HIGH"): "Immediate security intervention",
                ("Security", "MEDIUM"): "Security team assistance",
                ("Other", "LOW"): "Routine assistance",
                ("Other", "MEDIUM"): "Campus safety team assistance",
            }
            rec_resp = responses.get((pred_type, pred_priority), "Campus safety team assistance")
            return {
                "emergency_type": pred_type,
                "priority": pred_priority,
                "recommended_response": rec_resp,
            }
        except Exception:
            pass

    # -------------------------------------------------------------------------
    # DEFAULT "OTHER"
    # -------------------------------------------------------------------------
    return {
        "emergency_type": "Other",
        "priority": "MEDIUM",
        "recommended_response": "Campus safety team assistance",
    }


def evaluate_priority(emergency_type: str, message: str = "") -> Tuple[str, str]:
    """
    Backward-compatible helper for Step 1 callers.
    Returns (priority, recommended_response) tuple.
    """
    res = classify_emergency(emergency_type, message)
    return res["priority"], res["recommended_response"]
