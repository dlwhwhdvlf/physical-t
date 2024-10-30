import React, { useState } from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from "recharts";
import './Calendar.css';
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";

// 7일간의 푸시업 예시 데이터
const data7Days = [
  { date: "08.06", 횟수: 48 },
  { date: "08.07", 횟수: 56 },
  { date: "08.08", 횟수: 64 },
  { date: "08.09", 횟수: 72 },
  { date: "08.10", 횟수: null },
  { date: "08.11", 횟수: 80 },
  { date: "08.12", 횟수: null },
];

// 푸시업에 대한 등급 기준선
const pushupLevels = [
  { value: 48, label: "3급", color: "#ff7979" },
  { value: 56, label: "2급", color: "#f39c12" },
  { value: 64, label: "1급", color: "#2ecc71" },
  { value: 72, label: "특급", color: "#3498db" },
];

// 페이스 데이터 예시 (구간별 속도)
const paceData = [
  { 구간: "0초", 속도: 0 },
  { 구간: "20초", 속도: 15 },
  { 구간: "40초", 속도: 13 },
  { 구간: "1분", 속도: 12 },
  { 구간: "1분 20초", 속도: 10 },
  { 구간: "1분 40초", 속도: 9 },
  { 구간: "2분", 속도: 6 },
];

function MainPage() {
  const [cookies] = useCookies(['access_token']);
  const [tokenMessage, setTokenMessage] = useState("");

  // 버튼 클릭 시 쿠키의 access token을 가져오는 함수
  const handleShowToken = () => {
    const accessToken = cookies.access_token;
    setTokenMessage(accessToken ? `Access Token: ${accessToken}` : "토큰이 설정되지 않았습니다.");
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data7Days}>
        <CartesianGrid vertical={false} stroke="#444" />
        <XAxis dataKey="date" stroke="#888" />
        <YAxis
          domain={[40, 80]}  // 고정된 Y축 범위 설정
          ticks={[pushupLevels[0].value, pushupLevels[1].value, pushupLevels[2].value, pushupLevels[3].value]}
          tick={false}  // 회색 눈금 제거
          stroke="#888"
        />
        <Tooltip formatter={(value) => (value === null ? "운동 안 함" : value)} />
        {pushupLevels.map((line, index) => (
          <ReferenceLine
            key={index}
            y={line.value}
            label={{ position: "left", value: line.label, fill: line.color }}
            stroke={line.color}
            strokeDasharray="3 3"
          />
        ))}
        <Bar dataKey="횟수" fill="#3498db" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={paceData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="구간" />
        <YAxis domain={[0, 20]} />
        <Tooltip />
        <Line type="monotone" dataKey="속도" stroke="#82ca9d" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>통계</h2>
      </header>

      <div style={styles.content}>
        <div style={styles.chartSection}>
          <h3 style={styles.sectionTitle}>최근 7일 운동</h3>
          <span style={styles.dateRange}>08.06 - 08.12</span>
          <div style={styles.chartContainer}>{renderBarChart()}</div>
        </div>

        <div style={styles.chartSection}>
          <h3 style={styles.sectionTitle}>페이스</h3>
          <span style={styles.description}>구간 별로 회원님의 운동 속도를 측정했어요</span>
          <div style={styles.chartContainer}>{renderLineChart()}</div>
        </div>

        <div style={styles.buttonSection}>
          <Link to="/daily-record" style={styles.button}>날짜별 운동 기록 보기</Link>
        </div>
      </div>

      {/* 우측 하단 버튼 */}
      <button onClick={handleShowToken} style={styles.saveTokenButton}>
        토큰 보기
      </button>
      {tokenMessage && <p style={styles.tokenMessage}>{tokenMessage}</p>}
    </div>
  );
}

// 날짜별 운동 기록 페이지 컴포넌트
function DailyRecordPage() {
  const [cookies] = useCookies(['access_token']);
  const [tokenMessage, setTokenMessage] = useState("");
  const [date, setDate] = useState(new Date());
  const navigate = useNavigate(); // 뒤로가기

  const handleShowToken = () => {
    const accessToken = cookies.access_token;
    setTokenMessage(accessToken ? `Access Token: ${accessToken}` : "토큰이 설정되지 않았습니다.");
  };

  const tileDisabled = ({ date, view }) => {
    if (view === "month") {
      const currentMonth = new Date().getMonth();
      return date.getMonth() !== currentMonth;
    }
    return false;
  };

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={paceData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="구간" />
        <YAxis domain={[0, 20]} />
        <Tooltip />
        <Line type="monotone" dataKey="속도" stroke="#82ca9d" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          뒤로가기
        </button>
        <h2 style={styles.title}>캘린더</h2>
      </header>

      <div style={styles.content}>
        <div style={styles.calendarSection}>
          <Calendar
            onChange={setDate}
            value={date}
            tileDisabled={tileDisabled}
            showNeighboringMonth={false}
          />
        </div>

        <div style={styles.recordSection}>
          <h3 style={styles.sectionTitle}>1 등급 입니다 🎉</h3>
          <div style={styles.recordDetails}>
            <p>시간: 02:00</p>
            <p>횟수: 65</p>
            <p>평균 페이스: 10.8</p>
          </div>
        </div>

        <div style={styles.chartSection}>
          <h3 style={styles.sectionTitle}>페이스</h3>
          <span style={styles.description}>구간 별로 회원님의 운동 속도를 측정했어요</span>
          <div style={styles.chartContainer}>{renderLineChart()}</div>
        </div>
      </div>

      {/* 우측 하단 버튼 */}
      <button onClick={handleShowToken} style={styles.saveTokenButton}>
        토큰 보기
      </button>
      {tokenMessage && <p style={styles.tokenMessage}>{tokenMessage}</p>}
    </div>
  );
}


// 기본 App 컴포넌트
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/daily-record" element={<DailyRecordPage />} />
      </Routes>
    </Router>
  );
}

// 스타일 정의
const styles = {
  container: {
    backgroundColor: "#0d0d0d",
    color: "#fff",
    minHeight: "100vh",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    width: "100%",
    marginBottom: "20px",
  },
  title: {
    fontSize: "1.8em",
    fontWeight: "bold",
    color: "#fff",
    textAlign: "left",
  },
  content: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  calendarSection: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  chartSection: {
    backgroundColor: "#1a1a1a",
    borderRadius: "10px",
    padding: "20px",
    position: "relative",
  },
  sectionTitle: {
    fontSize: "1.2em",
    marginBottom: "10px",
  },
  description: {
    fontSize: "0.9em",
    color: "#aaa",
  },
  dateRange: {
    fontSize: "0.9em",
    color: "#aaa",
    position: "absolute",
    top: "20px",
    right: "20px",
  },
  buttonSection: {
    display: "flex",
    justifyContent: "center",
  },
  button: {
    padding: "15px 25px",
    backgroundColor: "#444",
    border: "none",
    borderRadius: "25px",
    color: "#fff",
    fontSize: "1em",
    textDecoration: "none",
    textAlign: "center",
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  recordSection: {
    backgroundColor: "#1a1a1a",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "20px",
    textAlign: "center",
  },
  recordDetails: {
    display: "flex",
    justifyContent: "space-around",
    fontSize: "1.2em",
  },
  saveTokenButton: {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    padding: "10px 20px",
    backgroundColor: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  tokenMessage: {
    position: "fixed",
    right: "20px",
    bottom: "60px",
    color: "#fff",
    backgroundColor: "#444",
    padding: "5px 10px",
    borderRadius: "5px",
  },

};

export default App;
