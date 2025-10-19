import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

const Preview = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState(state?.participants || []);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const updated = participants.map((p) => {
      if (!p.category && p.age) {
        const ageNum = parseInt(p.age);
        return { ...p, category: ageNum >= 13 ? "Teen" : "Kids" };
      }
      return p;
    });
    setParticipants(updated);
  }, [participants.length]);

  if (!participants || participants.length === 0) {
    return (
      <div style={styles.center}>
        <h2>No registration data found</h2>
        <button onClick={() => navigate("/register")} style={styles.button}>
          Go Back
        </button>
      </div>
    );
  }

  const handleChange = (index, field, value) => {
    const updated = [...participants];
    updated[index][field] = value;


   if (field === "age") {
      const ageNum = parseInt(value);
      updated[index].category = !isNaN(ageNum)
        ? ageNum >= 13
          ? "Teen"
          : "Kids"
        : "";
    }

    setParticipants(updated);
  };

  const handleDelete = (index) => {
    const updated = participants.filter((_, i) => i !== index);
    setParticipants(updated);
  };

  const validate = () => {
    for (let p of participants) {
      if (!p.participantName || !p.age || !p.category || !p.medicalConditions)
        return false;
      if (p.medicalConditions === "Other" && !p.otherMedicalCondition)
        return false;
    }
    return true;
  };
  
const handleFinalSubmit = async () => {
    if (!validate()) {
      alert("❌ Please fill all mandatory fields including medical conditions.");
      return;
    }
  
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const savedDocs = [];
  
      for (let p of participants) {
        // Fetch last ID
        const q = query(usersRef, orderBy("createdAt", "desc"), limit(1));
        const snap = await getDocs(q);
        let lastNumber = 0;
        snap.forEach((doc) => {
          const lastId = doc.data()?.studentId;
          if (lastId) lastNumber = parseInt(lastId.replace("STU-", "")) || 0;
        });
  
        // Assign new separate ID per participant
        const newStudentId = `STU-${String(lastNumber + 1).padStart(3, "0")}`;
        const newFamilyId = `MCC-${String(lastNumber + 1).padStart(5, "0")}`;
  
        const dataToSave = { 
          ...p, 
          studentId: newStudentId, 
          familyId: newFamilyId, // use for barcode & display
          createdAt: new Date() 
        };
  
        const docRef = await addDoc(usersRef, dataToSave);
        savedDocs.push({ ...dataToSave, docId: docRef.id });
      }
  
      alert("✅ Registration submitted successfully!");
  
      // Send first participant as main, others as siblings
      navigate("/id-card", {
        state: {
          formData: savedDocs[0],
          siblings: savedDocs.slice(1),
        },
      });
    } catch (err) {
      console.error(err);
      alert("❌ Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  const renderField = (participant, index, label, name, type = "text") => (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={participant[name] || ""}
        onChange={(e) => handleChange(index, name, e.target.value)}
      />
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Review & Edit Registration</h2>
        <p>Edit details before final submission</p>
      </div>

      <div style={styles.cardsContainer}>
        {participants.map((p, index) => (
          <div key={index} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3>{index === 0 ? "Main Participant" : `Sibling ${index}`}</h3>
              {index !== 0 && (
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDelete(index)}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={styles.cardBody}>
              <div style={styles.grid}>
                {renderField(p, index, "Full Name", "participantName")}
                {renderField(p, index, "Age", "age", "number")}
                {renderField(p, index, "Category", "category", "text")}
                {renderField(p, index, "Father's Name", "fatherName")}
                {renderField(p, index, "Mother's Name", "motherName")}
                {renderField(p, index, "Father's Mobile", "contactFatherMobile")}
                {renderField(p, index, "Mother's Mobile", "contactMotherMobile")}
                {renderField(p, index, "Email", "email", "email")}
                {renderField(p, index, "Residence", "residence")}

                <div style={styles.field}>
                  <label>Medical Conditions *</label>
                  <select
                    style={styles.input}
                    value={p.medicalConditions || ""}
                    onChange={(e) =>
                      handleChange(index, "medicalConditions", e.target.value)
                    }
                  >
                    <option value="">Select</option>
                    <option value="None">None</option>
                    <option value="Asthma">Asthma</option>
                    <option value="Allergy">Allergy</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {p.medicalConditions === "Other" && (
                  <div style={styles.field}>
                    <label>Specify Condition *</label>
                    <input
                      style={styles.input}
                      type="text"
                      value={p.otherMedicalCondition || ""}
                      onChange={(e) =>
                        handleChange(index, "otherMedicalCondition", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.buttonGroup}>
        <button
          style={styles.backBtn}
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          ← Back to Form
        </button>
        <button
          style={styles.submitBtn}
          onClick={handleFinalSubmit}
          disabled={loading}
        >
          {loading ? "Submitting..." : "✅ Submit All"}
        </button>
      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "20px 15px",
    fontFamily: "'Poppins', sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  cardsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  deleteBtn: {
    backgroundColor: "#e74c3c",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "5px 10px",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 15,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontWeight: 600,
    marginBottom: 5,
    display: "block",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    boxSizing: "border-box",
  },
  buttonGroup: {
    display: "flex",
    justifyContent: "center",
    gap: 15,
    marginTop: 25,
    flexWrap: "wrap",
  },
  backBtn: {
    backgroundColor: "#aaa",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 15,
    cursor: "pointer",
  },
  submitBtn: {
    backgroundColor: "#6c3483",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: 8,
    fontSize: 15,
    cursor: "pointer",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    flexDirection: "column",
  },
};

export default Preview;
