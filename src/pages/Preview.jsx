import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const Preview = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState(state?.participants || []);
  const [loading, setLoading] = useState(false);

  // ---------------- UTILITY ----------------
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getCategory = (age) => {
    if (age >= 8 && age <= 12) return "DGK";
    if (age >= 13 && age <= 18) return "DGT";
    return null;
  };

  // -------------- INITIALIZE PARTICIPANTS --------------
  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) => {
        const age = p.age ?? (p.dob ? calculateAge(p.dob) : null);
        return {
          ...p,
          age,
          category: p.category ?? (age ? getCategory(age) : ""),
          medicalConditions: p.medicalConditions || "",
          additionalMedicalNotes: p.additionalMedicalNotes || "",
        };
      })
    );
  }, []);

  // ---------------- HANDLERS ----------------
  const handleChange = (index, field, value) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index][field] = value;

      if (field === "dob") {
        const age = calculateAge(value);
        updated[index].age = age;
        updated[index].category = getCategory(age) || "";
      }

      return updated;
    });
  };

  const handleDelete = (index) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const validateParticipants = () => {
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (!p.participantName) return false;
      if (!p.age || p.age < 8 || p.age > 18) return false;
      if (!p.category) return false;

      if (i === 0 && (!p.dob || !p.primaryContactNumber)) return false;
      if (p.medicalConditions === "Other" && !p.additionalMedicalNotes) return false;
    }
    return true;
  };

  // ---------------- FINAL SUBMIT ----------------
  const handleFinalSubmit = async () => {
    if (!validateParticipants()) {
      alert("❌ Please fill all required fields correctly and ensure valid ages (8–18).");
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const savedDocs = [];

      // Get last student ID number
      const q = query(usersRef, orderBy("createdAt", "desc"), limit(1));
      const snap = await getDocs(q);
      let lastNumber = 0;
      snap.forEach((doc) => {
        const lastId = doc.data()?.studentId;
        const num = lastId ? parseInt(lastId.replace(/\D/g, "")) : 0;
        if (!isNaN(num)) lastNumber = num;
      });

      // Save each participant
      for (const p of participants) {
        lastNumber++;

        const prefix = getCategory(p.age);
        if (!prefix) {
          alert(`❌ Participant ${p.participantName} has invalid age.`);
          setLoading(false);
          return;
        }

        const studentId = `${prefix}-${String(lastNumber).padStart(3, "0")}`;

        const data = {
          participantName: p.participantName,
          dob: p.dob || null,
          age: p.age,
          category: prefix,
          primaryContactNumber: p.primaryContactNumber || "",
          primaryContactRelationship: p.primaryContactRelationship || "",
          medicalConditions: p.medicalConditions || "",
          additionalMedicalNotes: p.additionalMedicalNotes || "",
          studentId,
          familyId: studentId,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(usersRef, data);
        savedDocs.push({ ...data, docId: docRef.id });
      }

      navigate("/id-card", {
        state: { formData: savedDocs[0], siblings: savedDocs.slice(1) },
      });
    } catch (err) {
      console.error(err);
      alert(`❌ Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (participant, index, label, name, type = "text", readOnly = false) => (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={participant[name] ?? ""}
        onChange={(e) => handleChange(index, name, e.target.value)}
        readOnly={readOnly}
      />
    </div>
  );

  // ----------------- RENDER -----------------
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2>Review & Edit Registration</h2>
        <p>Edit details before final submission</p>
      </header>

      <div style={styles.cardsContainer}>
        {participants.map((p, index) => (
          <div key={index} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3>{index === 0 ? "Main Participant" : `Sibling ${index}`}</h3>
              {index !== 0 && (
                <button style={styles.deleteBtn} onClick={() => handleDelete(index)}>
                  ✕
                </button>
              )}
            </div>

            <div style={styles.cardBody}>
              <div style={styles.grid}>
                {renderInput(p, index, "Participant's Name", "participantName")}
                {index === 0
                  ? renderInput(p, index, "Date of Birth", "dob", "date")
                  : renderInput(p, index, "Age", "age", "text", true)}
                {renderInput(p, index, "Category Code", "category", "text", true)}
                {renderInput(
                  p,
                  index,
                  index === 0
                    ? "Primary Contact Number"
                    : "Primary Contact Number (optional)",
                  "primaryContactNumber"
                )}
                {index === 0 &&
                  renderInput(p, index, "Primary Contact Relationship", "primaryContactRelationship")}
                <div style={styles.field}>
                  <label>Medical Conditions</label>
                  <select
                    style={styles.input}
                    value={p.medicalConditions || ""}
                    onChange={(e) => handleChange(index, "medicalConditions", e.target.value)}
                  >
                    <option value="">Select condition</option>
                    <option value="N/A">N/A</option>
                    <option value="Asthma">Asthma</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Allergies">Allergies</option>
                    <option value="Epilepsy">Epilepsy</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {p.medicalConditions === "Other" &&
                  renderInput(p, index, "Additional Medical Notes", "additionalMedicalNotes")}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.buttonGroup}>
        <button style={styles.backBtn} onClick={() => navigate(-1)} disabled={loading}>
          ← Back to Form
        </button>
        <button style={styles.submitBtn} onClick={handleFinalSubmit} disabled={loading}>
          {loading ? "Submitting..." : "✅ Submit All"}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: 800, margin: "0 auto", padding: "20px 15px", fontFamily: "'Poppins', sans-serif" },
  header: { textAlign: "center", marginBottom: 20 },
  cardsContainer: { display: "flex", flexDirection: "column", gap: 20 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  deleteBtn: { backgroundColor: "#e74c3c", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 15 },
  field: { marginBottom: 10 },
  label: { fontWeight: 600, marginBottom: 5, display: "block" },
  input: { width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 14, boxSizing: "border-box" },
  buttonGroup: { display: "flex", justifyContent: "center", gap: 15, marginTop: 25, flexWrap: "wrap" },
  backBtn: { backgroundColor: "#aaa", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, fontSize: 15, cursor: "pointer" },
  submitBtn: { backgroundColor: "#6c3483", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, fontSize: 15, cursor: "pointer" },
};

export default Preview;
