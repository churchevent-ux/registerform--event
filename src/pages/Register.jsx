import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

// Logos
import Logo from "../images/church logo2.png";
import Logo2 from "../images/logo.jpg";
import Logo3 from "../images/logo2.png";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);


  const [formData, setFormData] = useState({
    participantName: "",
    dob: "",
    age: "",
    category: "",
    categoryColor: "",
    fatherName: "",
    motherName: "",
    contactHome: "",
    contactFatherOffice: "",
    contactFatherMobile: "",
    contactMotherOffice: "",
    contactMotherMobile: "",
    email: "",
    residence: "",
    parentAgreement: false,
    parentSignature: "",
    medicalConditions: [],
    otherCondition: "",
    medicalNotes: "",
    siblings: [], // ✅ NEW FIELD
  });
  

  // Auto age calculation & category assignment
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let ageNow = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageNow--;
  
      let category = "";
      let categoryColor = "";
  
      if (ageNow >= 7 && ageNow <= 12) {
        category = "Junior";
        categoryColor = "red";
      } else if (ageNow >= 13 && ageNow <= 25) {
        category = "Senior";
        categoryColor = "blue";
      }
  
      setFormData((prev) => ({
        ...prev,
        age: ageNow.toString(),
        category,
        categoryColor,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        age: "",
        category: "",
        categoryColor: "",
      }));
    }
  }, [formData.dob]);
  

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleMedicalCondition = (cond) => {
    setFormData((prev) => {
      const exists = prev.medicalConditions.includes(cond);
      const updatedConditions = exists
        ? prev.medicalConditions.filter((c) => c !== cond)
        : [...prev.medicalConditions, cond];
      return { ...prev, medicalConditions: updatedConditions };
    });
  };




  // Add a new sibling row
const handleAddSibling = () => {
  setFormData((prev) => ({
    ...prev,
    siblings: [...prev.siblings, { name: "", contact: "" }],
  }));
};

// Update sibling details
const handleSiblingChange = (index, field, value) => {
  const updatedSiblings = [...formData.siblings];
  updatedSiblings[index][field] = value;
  setFormData({ ...formData, siblings: updatedSiblings });
};

// Remove a sibling
const handleRemoveSibling = (index) => {
  const updatedSiblings = formData.siblings.filter((_, i) => i !== index);
  setFormData({ ...formData, siblings: updatedSiblings });
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  setLoading(true); // ✅ Start loading

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("createdAt", "desc"), limit(1));
    const snap = await getDocs(q);

    let lastNumber = 0;
    snap.forEach((doc) => {
      const lastId = doc.data()?.studentId;
      if (lastId) lastNumber = parseInt(lastId.replace("STU-", "")) || 0;
    });

    const newStudentId = `STU-${String(lastNumber + 1).padStart(3, "0")}`;
    const dataToSave = {
      ...formData,
      studentId: newStudentId,
      createdAt: new Date(),
    };

    const docRef = await addDoc(usersRef, dataToSave);
    const dataWithId = { ...dataToSave, docId: docRef.id };

    navigate("/id-card", { state: { formData: dataWithId } });
  } catch (err) {
    console.error("Error submitting registration:", err);
    alert("❌ Failed to submit registration. Please try again.");
  } finally {
    setLoading(false); // ✅ Stop loading
  }
};


  return (
    <div style={styles.container}>
      {/* Floating Home Button */}
      <div style={styles.floatingButton}>
        <button onClick={() => navigate("/")} style={styles.Homebutton}>
          Home
        </button>
      </div>

      <Header />

      <div style={styles.formWrapper}>
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Participant Info */}
          <Card title="👦 Participant Information">
            <Input
              label="Participant's Name (CAPITALS)"
              name="participantName"
              value={formData.participantName}
              onChange={handleChange}
              required
            />
            <Row>
              <Input
                label="Date of Birth"
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
              />
              <Input
                label="Age (auto)"
                type="text"
                name="age"
                value={formData.age}
                readOnly
              />
            </Row>
            <CategoryDisplay age={formData.age} category={formData.category} />
          </Card>

          {/* Parent Info */}
          <Card title="👨‍👩‍👧 Parent Information">
            <Row>
              <Input
                label="Father’s Name"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
              />
              <Input
                label="Mother’s Name"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
              />
            </Row>
          </Card>

          {/* Contact Details */}
          <Card title="📞 Contact Details">
  <Input
    label="Home Contact"
    type="tel"
    name="contactHome"
    value={formData.contactHome}
    onChange={(e) => {
      let val = e.target.value;

      // Allow + only at the start, digits everywhere else
      if (val.startsWith("+")) {
        val = "+" + val.slice(1).replace(/\D/g, "");
      } else {
        val = val.replace(/\D/g, "");
      }

      setFormData({ ...formData, contactHome: val });
    }}
    placeholder="Enter home contact number"
  />
  <Row>
    <Input
      label="Father - Office"
      type="tel"
      name="contactFatherOffice"
      value={formData.contactFatherOffice}
      onChange={(e) => {
        let val = e.target.value;
        val = val.startsWith("+") ? "+" + val.slice(1).replace(/\D/g, "") : val.replace(/\D/g, "");
        setFormData({ ...formData, contactFatherOffice: val });
      }}
      placeholder="Enter office number"
    />
    <Input
      label="Father - Mobile"
      type="tel"
      name="contactFatherMobile"
      value={formData.contactFatherMobile}
      onChange={(e) => {
        let val = e.target.value;
        val = val.startsWith("+") ? "+" + val.slice(1).replace(/\D/g, "") : val.replace(/\D/g, "");
        setFormData({ ...formData, contactFatherMobile: val });
      }}
      placeholder="Enter mobile number"
    />
  </Row>
  <Row>
    <Input
      label="Mother - Office"
      type="tel"
      name="contactMotherOffice"
      value={formData.contactMotherOffice}
      onChange={(e) => {
        let val = e.target.value;
        val = val.startsWith("+") ? "+" + val.slice(1).replace(/\D/g, "") : val.replace(/\D/g, "");
        setFormData({ ...formData, contactMotherOffice: val });
      }}
      placeholder="Enter office number"
    />
    <Input
      label="Mother - Mobile"
      type="tel"
      name="contactMotherMobile"
      value={formData.contactMotherMobile}
      onChange={(e) => {
        let val = e.target.value;
        val = val.startsWith("+") ? "+" + val.slice(1).replace(/\D/g, "") : val.replace(/\D/g, "");
        setFormData({ ...formData, contactMotherMobile: val });
      }}
      placeholder="Enter mobile number"
    />
  </Row>
  <Input
    label="Email"
    type="email"
    name="email"
    value={formData.email}
    onChange={handleChange}
  />
  <Input
    label="Residence Location"
    name="residence"
    value={formData.residence}
    onChange={handleChange}
  />
</Card>



{/* Sibling Information */}
<Card title="👫 Sibling Information">
  {formData.siblings.length > 0 ? (
    formData.siblings.map((sibling, index) => (
      <div
        key={index}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center", // aligns button and inputs perfectly
          gap: "10px",
          marginBottom: "15px",
          background: "#fafafa",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #ddd",
        }}
      >
        {/* Name Input */}
        <div style={{ flex: 1, minWidth: "220px" }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            Sibling Name
          </label>
          <input
            type="text"
            value={sibling.name}
            onChange={(e) =>
              handleSiblingChange(index, "name", e.target.value)
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Contact Input */}
        <div style={{ flex: 1, minWidth: "220px" }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            Sibling Contact
          </label>
          <input
            type="tel"
            value={sibling.contact}
            onChange={(e) =>
              handleSiblingChange(index, "contact", e.target.value)
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* ❌ Remove Button */}
        <button
          type="button"
          onClick={() => handleRemoveSibling(index)}
          style={{
            background: "#ff4d4d",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "26px",
            height: "26px",
            fontSize: "18px",
            fontWeight: "bold",
            lineHeight: "1",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "24px", // aligns with bottom of inputs' label spacing
          }}
          title="Remove Sibling"
        >
          ×
        </button>
      </div>
    ))
  ) : (
    <p style={{ fontSize: 14, color: "#555" }}>
      No siblings added yet.
    </p>
  )}

  {/* Add Sibling Button */}
  <button
    type="button"
    onClick={handleAddSibling}
    style={{
      backgroundColor: "#6c3483",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      padding: "10px 18px",
      fontSize: "14px",
      cursor: "pointer",
      width: "fit-content",
    }}
  >
    ➕ Add Sibling
  </button>
</Card>




          {/* Medical Info */}
          <Card title="🩺 Medical Information">
            <p style={{ fontSize: 14, marginBottom: 10 }}>
              Please indicate any conditions (check all that apply):
            </p>
            <div style={styles.checkboxGroup}>
              {["N/A", "Asthma", "Diabetes", "Allergies", "Epilepsy", "Other"].map(
                (cond) => (
                  <label key={cond} style={{ fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={formData.medicalConditions.includes(cond)}
                      onChange={() => handleMedicalCondition(cond)}
                    />{" "}
                    {cond}
                  </label>
                )
              )}
            </div>
            {formData.medicalConditions.includes("Other") && (
              <Input
                label="Specify other condition"
                name="otherCondition"
                value={formData.otherCondition}
                onChange={handleChange}
              />
            )}
          <label style={styles.label}>Additional Medical Notes</label>
          <textarea
  name="medicalNotes"
  value={formData.medicalNotes}
  onChange={handleChange}
  placeholder="Write N/A if none"
  disabled={formData.medicalConditions.includes("N/A")}
  style={{
    ...styles.textarea,
    backgroundColor: formData.medicalConditions.includes("N/A") ? "#f0f0f0" : "#fff",
    cursor: formData.medicalConditions.includes("N/A") ? "not-allowed" : "text",
  }}
/>


          </Card>

          {/* Agreement */}
          <Card title="🙏 Parent Agreement">
            <label style={styles.label}>
              <input
                type="checkbox"
                name="parentAgreement"
                checked={formData.parentAgreement}
                onChange={handleChange}
                required
              />{" "}
              I agree to bring and collect my child.
            </label>
            <Input
              label="Signature of Parent"
              name="parentSignature"
              value={formData.parentSignature}
              onChange={handleChange}
            />
          </Card>

          <ImportantNotes />

          <button
  type="submit"
  style={{
    ...styles.submitButton,
    opacity: loading ? 0.7 : 1,
    cursor: loading ? "not-allowed" : "pointer",
  }}
  disabled={loading}
>
  {loading ? "Submitting..." : "✨ Submit Registration"}
</button>

        </form>
      </div>
    </div>
  );
};

/* ---------------- Styles ---------------- */
const styles = {
  container: {
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(to bottom, #fdfcfb, #f4ede2)",
    padding: 10,
    width: "100%",
    boxSizing: "border-box",
  },
  floatingButton: {
    position: "fixed",
    top: 10,
    right: 10,
    zIndex: 999,
  },
  Homebutton: {
    padding: "5px 16px",
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: "#46464628",
    color: "#000000ff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  formWrapper: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "0 10px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    width: "100%",
  },
  checkboxGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  label: {
    fontWeight: 600,
    display: "block",
    marginBottom: 6,
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 14,
    minHeight: 80,
    boxSizing: "border-box",
  },
  submitButton: {
    width: "100%",
    padding: 14,
    fontSize: 15,
    fontWeight: 600,
    backgroundColor: "#6c3483",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 10,
  },
};

/* ---------------- Header ---------------- */
const Header = () => (
  <div style={headerStyles.container}>
    <div style={headerStyles.wrapper}>
      {/* Left Logos */}
      <div style={headerStyles.left}>
        <img src={Logo} alt="Logo2" style={headerStyles.logo} />
        {/* <img src={Logo3} alt="Logo3" style={headerStyles.logo} /> */}
      </div>

      {/* Center Text */}
      <div style={headerStyles.center}>
        <h2 style={headerStyles.title}>Charis Malayalam Dubai</h2>
        <h3 style={headerStyles.subtitle}>St. Mary’s Church, Dubai</h3>
        <p style={headerStyles.text}>P.O. BOX: 51200, Dubai, U.A.E</p>
        <h1 style={headerStyles.mainTitle}>Christ Experience</h1>
        <h2 style={headerStyles.subTitle}>Christeen Retreat 2025</h2>
        <p style={headerStyles.textItalic}>By Marian Ministry</p>
        <p style={headerStyles.text}>(December 28th to 30th)</p>
      </div>

      {/* Right Logo */}
      <div style={headerStyles.right}>
        {/* <img src={Logo} alt="Logo" style={headerStyles.logo} /> */}
      </div>
    </div>
  </div>
);

const headerStyles = {
  container: {
    width: "100%",
    background: "rgba(255,255,255,0.95)",
    borderTop: "6px solid #6c3483",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    marginBottom: 20,
  },
  wrapper: {
    maxWidth: 1000,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    padding: 10,
    boxSizing: "border-box",
    gap: 15,
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
  },
  right: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    textAlign: "center",
  },
  logo: {
    maxWidth: 120,
    height: "auto",
  },
  title: { margin: 0, fontSize: 18, color: "#2c3e50", textTransform: "uppercase" },
  subtitle: { margin: "5px 0", fontSize: 14, color: "#555" },
  text: { margin: "5px 0", fontSize: 12, color: "#666" },
  mainTitle: { marginTop: 5, fontSize: 18, color: "#8b0000", fontWeight: "bold" },
  subTitle: { margin: "5px 0", fontSize: 16, color: "#6c3483" },
  textItalic: { fontSize: 12, fontStyle: "italic", margin: "0 0 5px 0" },
};

/* ---------------- Helpers ---------------- */
const Row = ({ children }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{children}</div>
);

const Input = ({ label, type = "text", ...props }) => (
  <div style={{ flex: 1, minWidth: "250px", marginBottom: 10 }}>
    <label style={{ fontWeight: 600, marginBottom: 6, display: "block", fontSize: 14 }}>
      {label}
    </label>
    <input
      type={type}
      {...props}
      style={{
        width: "100%",
        padding: 10,
        borderRadius: 8,
        border: "1px solid #ddd",
        fontSize: 14,
        boxSizing: "border-box",
      }}
    />
  </div>
);

const CategoryDisplay = ({ age, category }) => {
  let display = "Enter Date of Birth to see category";

  if (age) {
    if (category === "Junior") {
      display = `Junior (8–12 Years)`;
    } else if (category === "Senior") {
      display = `Senior (13–18 Years)`;
    } else {
      display = "Not eligible (must be 8–18)";
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <label style={{ fontWeight: 600, marginBottom: 6, display: "block", fontSize: 14 }}>
        Category
      </label>
      <div
        style={{
          fontSize: 14,
          padding: 8,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#f8f8f8",
          width: "100%",
          maxWidth: 220,
        }}
      >
        {display}
      </div>

      
    </div>
  );
};


const Card = ({ title, children }) => (
  <div
    style={{
      background: "#fff",
      padding: 15,
      marginBottom: 20,
      borderRadius: 12,
      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
      borderLeft: "4px solid #6c3483",
      width: "100%",
      boxSizing: "border-box",
    }}
  >
    <h3
      style={{
        marginBottom: 10,
        fontSize: 16,
        color: "#6c3483",
        borderBottom: "1px solid #eee",
        paddingBottom: 6,
      }}
    >
      {title}
    </h3>
    {children}
  </div>
);

const ImportantNotes = () => (
  <Card title="⚠️ Important Notes">
    <ul style={{ fontSize: 14, lineHeight: 1.6, paddingLeft: 18 }}>
      <li>All participants must have parental consent.</li>
      <li>Medical info must be accurate; carry necessary medications.</li>
      <li>
        Registration is confirmed only after submission of this form, along with
        the fee of Dhs.100/- at the Office of the Spiritual Director Fr Alex.
      </li>
      <li>Age Category: JUNIORS - 8 to 12 Years / SENIORS – 13 to 18 Years.</li>
      <li>
        Drop-off at 8:15 AM and pick-up at 5:15 PM from the entrance of Main
        Hall.
      </li>
      <li>Please carry your ID badge every day.</li>
      <li>
        Transportation will not be provided; parents are responsible for
        bringing and collecting their child.
      </li>
      <li>Please bring Bible, notebook, pen; food will be served.</li>
      <li>
        Mobile phones, smartwatches, and any other electronic gadgets are strictly
        not allowed during the session.
      </li>
      <li>
        For any further information or queries, please contact Christeen team
        members:
      </li>
      <ul
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          paddingLeft: 18,
          listStyleType: "circle",
        }}
      >
       <li>Shaji Joseph: 055 7339724</li>
        <li>Jyotish: 056 9916400</li>
      </ul>
    </ul>
  </Card>
);

export default Register;
