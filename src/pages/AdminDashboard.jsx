import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { FaUserPlus, FaSignInAlt, FaSignOutAlt, FaCoffee, FaUsers } from "react-icons/fa";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // Listen to users collection
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to attendance collection
    const unsubscribeAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          date: d.timestamp.toDate().toISOString().split("T")[0],
        };
      });
      setAttendance(data);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeAttendance();
    };
  }, []);

  // ---------- Today's Attendance ----------
  const todayAttendance = attendance.filter(a => a.date === todayStr && a.mode === "signin");

  // Only consider registered users
  const todayAttendanceRegistered = todayAttendance.filter(a =>
    users.some(u => u.id === a.studentId)
  );

  const todayPresent = todayAttendanceRegistered.length;
  const sessionIn = todayPresent;
  const totalRegisters = users.length;
  const sessionOut = Math.max(totalRegisters - sessionIn, 0);
  const totalBreaks = users.reduce((acc, u) => acc + (u.breaks?.length || 0), 0);
  const todayAbsent = Math.max(totalRegisters - todayPresent, 0);

  const presentNames = todayAttendanceRegistered.map(a => a.studentName || "Unknown").join(", ");

  // ---------- Stats Cards ----------
  const stats = [
    { title: "Total Registers", value: totalRegisters, icon: <FaUserPlus />, color: "#2980b9" },
    { title: "Session In", value: sessionIn, icon: <FaSignInAlt />, color: "#27ae60" },
    { title: "Session Out", value: sessionOut, icon: <FaSignOutAlt />, color: "#c0392b" },
    { title: "Breaks Taken", value: totalBreaks, icon: <FaCoffee />, color: "#f39c12" },
    { title: "Today's Present", value: todayPresent, icon: <FaUsers />, color: "#8e44ad" },
  ];

  // ---------- Weekly Attendance ----------
  const getLast7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });
  };

  const last7Days = getLast7Days();

  const weeklyData = last7Days.map(date => {
    const studentsPresent = attendance.filter(a => a.date === date && a.mode === "signin").length;
    return { studentsPresent };
  });

  const chartData = {
    labels: last7Days.map(d => new Date(d).toLocaleDateString("en-US", { weekday: "short" })),
    datasets: [
      { label: "Students Present", data: weeklyData.map(w => w.studentsPresent), backgroundColor: "#2980b9", borderRadius: 6 },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Weekly Attendance", font: { size: 18 } },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Admin Dashboard</h2>

      {/* Stats Cards */}
      <div style={styles.grid}>
        {stats.map(stat => (
          <div key={stat.title} style={{ ...styles.card, borderLeft: `5px solid ${stat.color}` }}>
            <div style={styles.icon}>{stat.icon}</div>
            <div>
              <h3 style={styles.cardTitle}>{stat.title}</h3>
              <p style={styles.cardValue}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Attendance */}
      <div style={styles.summary}>
        <p><strong>Today's Attendance:</strong></p>
        <p>Present ({todayPresent}): {presentNames}</p>
        <p>Absent ({todayAbsent})</p>
      </div>

      {/* Weekly Attendance Chart */}
      <div style={styles.chartContainer}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

const styles = {
  container: { display: "flex", flexDirection: "column", gap: 20, fontFamily: "Arial, sans-serif", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", color: "#333" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 15 },
  card: { display: "flex", alignItems: "center", gap: 10, backgroundColor: "#fff", padding: 15, borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" },
  cardTitle: { fontSize: 14, color: "#555", margin: 0 },
  cardValue: { fontSize: 18, fontWeight: "bold", margin: 0 },
  icon: { fontSize: 24, padding: 8, borderRadius: 50, backgroundColor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" },
  summary: { background: "#fff", padding: 15, borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" },
  chartContainer: { backgroundColor: "#fff", padding: 15, borderRadius: 12, boxShadow: "0 4px 15px rgba(0,0,0,0.1)", height: 300 },
};

export default AdminDashboard;
