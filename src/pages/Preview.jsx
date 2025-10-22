import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const MEDICAL_OPTIONS = ["N/A", "Asthma", "Diabetes", "Allergies", "Epilepsy", "Other"];

const Preview = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);

  /** Utility Functions **/
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getCategory = (age) => {
    if (age < 8) return { label: "Under 8", code: "UND" };
    if (age <= 12) return { label: "Kids", code: "DGK" };
    if (age <= 20) return { label: "Teen", code: "DGT" };
    return { label: "Over 20", code: "OVR" };
  };

  const getCardBackground = (categoryLabel) => {
    switch (categoryLabel) {
      case "Kids": return "#ffe6e6";
      case "Teen": return "#e6f0ff";
      default: return "#f5f5f5";
    }
  };

  const mapParticipantData = (p) => {
    const age = p.age ?? (p.dob ? calculateAge(p.dob) : null);
    const { label, code } = getCategory(age);
    const medConds = Array.isArray(p.medicalConditions) ? p.medicalConditions : p.medicalConditions ? [p.medicalConditions] : ["N/A"];
    return {
      participantName: p.participantName || p.name || p.siblingName || "",
      dob: p.dob || "",
      age,
      categoryLabel: label,
      categoryCode: code,
      primaryContactNumber: p.primaryContactNumber || "",
      primaryContactRelation: p.primaryContactRelation || "",
      secondaryContactNumber: p.secondaryContactNumber || "",
      secondaryContactRelationship: p.secondaryContactRelationship || "",
      email: p.email || "",
      medicalConditions: medConds,
      additionalMedicalNotes: p.additionalMedicalNotes || "",
    };
  };

  /** Load Participants **/
  useEffect(() => {
    const initializeParticipants = async () => {
      let initialParticipants = [];

      if (state?.participants?.length) {
        initialParticipants = state.participants.map(mapParticipantData);
      } else {
        setLoading(true);
        try {
          const usersRef = collection(db, "users");
          const snap = await getDocs(usersRef);
          initialParticipants = snap.docs.map((doc) => mapParticipantData(doc.data()));
        } catch (err) {
          console.error(err);
          alert("❌ Failed to fetch participants: " + err.message);
        } finally {
          setLoading(false);
        }
      }

      setParticipants(initialParticipants);
    };

    initializeParticipants();
  }, [state]);

  /** Handlers **/
  const handleChange = (index, field, value) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      if (field === "dob") {
        const age = calculateAge(value);
        const { label, code } = getCategory(age);
        updated[index].age = age;
        updated[index].categoryLabel = label;
        updated[index].categoryCode = code;
      }
      return updated;
    });
  };

  const handleMedicalSelect = (index, value) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index].medicalConditions = [value];
      if (value !== "Other") updated[index].additionalMedicalNotes = "";
      return updated;
    });
  };

  const validateParticipants = () => {
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (!p.participantName) return `Participant ${i + 1}: Name is required`;
      if (!p.age || !p.categoryCode) return `Participant ${i + 1}: Age/Category is required`;
      if (!p.medicalConditions.length) return `Participant ${i + 1}: Medical condition is required`;
      if (p.medicalConditions.includes("Other") && !p.additionalMedicalNotes) return `Participant ${i + 1}: Specify other medical condition`;
      if (!p.primaryContactNumber) return `Participant ${i + 1}: Primary contact number is required`;
      if (!p.primaryContactRelation) return `Participant ${i + 1}: Primary contact relationship is required`;
      if (!p.secondaryContactNumber) return `Participant ${i + 1}: Secondary contact number is required`;
      if (!p.secondaryContactRelationship) return `Participant ${i + 1}: Secondary contact relationship is required`;
    }
    return null;
  };

  const handleFinalSubmit = async () => {
    const error = validateParticipants();
    if (error) {
      alert("❌ " + error);
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const savedDocs = [];
      const q = query(usersRef, orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);
      let lastNumber = 0;
      snap.forEach((doc) => {
        const lastId = doc.data()?.studentId;
        const num = lastId ? parseInt(lastId.replace(/\D/g, "")) : 0;
        if (!isNaN(num)) lastNumber = num;
      });

      for (let p of participants) {
        lastNumber++;
        const studentId = `${p.categoryCode}-${String(lastNumber).padStart(3, "0")}`;
        const data = { ...p, studentId, familyId: studentId, createdAt: serverTimestamp() };
        const docRef = await addDoc(usersRef, data);
        savedDocs.push({ ...data, docId: docRef.id });
      }

      navigate("/id-card", { state: { formData: savedDocs[0], siblings: savedDocs.slice(1) } });
    } catch (err) {
      console.error(err);
      alert(`❌ Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>Review Registration</h2>
        <p>Check all participant details before final submission</p>
      </header>

      {loading && <p style={{ textAlign: "center" }}>Loading participants...</p>}

      <div style={styles.cardsContainer}>
        {participants.map((p, index) => (
          <div key={index} style={{ ...styles.card, backgroundColor: getCardBackground(p.categoryLabel) }}>
            <div style={styles.cardHeader}>
              <h3>{index === 0 ? "Participant" : `Sibling ${index}`}</h3>
              <span style={styles.categoryBadge}>{p.categoryLabel}</span>
            </div>

            <div style={styles.field}>
              <label>Name</label>
              <input style={styles.input} value={p.participantName} onChange={(e) => handleChange(index, "participantName", e.target.value)} />
            </div>

            <div style={styles.field}>
              <label>Age</label>
              <input style={styles.input} value={p.age} readOnly />
            </div>

            <div style={styles.field}>
              <label>Primary Contact</label>
              <input style={styles.input} value={p.primaryContactNumber} onChange={(e) => handleChange(index, "primaryContactNumber", e.target.value)} />
              <small>Relationship: {p.primaryContactRelation || "-"}</small>
            </div>

            <div style={styles.field}>
              <label>Secondary Contact</label>
              <input style={styles.input} value={p.secondaryContactNumber} onChange={(e) => handleChange(index, "secondaryContactNumber", e.target.value)} />
              <small>Relationship: {p.secondaryContactRelationship || "-"}</small>
            </div>

            <div style={styles.field}>
              <label>Email</label>
              <input style={styles.input} value={p.email} onChange={(e) => handleChange(index, "email", e.target.value)} />
            </div>

            <div style={styles.field}>
              <label>Medical Condition</label>
              <select style={styles.select} value={p.medicalConditions[0]} onChange={(e) => handleMedicalSelect(index, e.target.value)}>
                {MEDICAL_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              {p.medicalConditions.includes("Other") && (
                <input style={styles.input} placeholder="Specify other condition" value={p.additionalMedicalNotes} onChange={(e) => handleChange(index, "additionalMedicalNotes", e.target.value)} />
              )}
              <small style={{ color: "#555" }}>Choose N/A if none</small>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.buttonGroup}>
        <button style={styles.backBtn} onClick={() => navigate(-1)} disabled={loading}>← Back</button>
        <button style={styles.submitBtn} onClick={handleFinalSubmit} disabled={loading}>{loading ? "Submitting..." : "✅ Submit All"}</button>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: 950, margin: "0 auto", padding: 20, fontFamily: "'Poppins', sans-serif" },
  header: { textAlign: "center", marginBottom: 25 },
  cardsContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 25 },
  card: { borderRadius: 16, padding: 20, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  categoryBadge: { background: "#6c3483", color: "#fff", padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 },
  field: { marginBottom: 15, display: "flex", flexDirection: "column" },
  input: { padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 14 },
  select: { padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 14 },
  buttonGroup: { display: "flex", justifyContent: "center", gap: 15, marginTop: 30, flexWrap: "wrap" },
  backBtn: { backgroundColor: "#aaa", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, cursor: "pointer" },
  submitBtn: { backgroundColor: "#6c3483", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, cursor: "pointer" },
};

export default Preview;
