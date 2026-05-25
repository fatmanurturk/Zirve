from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def get_recommendations(user_summary: str, event_list: list[dict]) -> list[dict]:
    if not event_list:
        return []

    corpus = [user_summary] + [e["summary"] for e in event_list]

    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)

    scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

    for idx, score in enumerate(scores):
        event_list[idx]["match_score"] = round(float(score), 2)

    return sorted(event_list, key=lambda x: x["match_score"], reverse=True)
