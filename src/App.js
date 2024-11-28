import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from "recharts";
import './Calendar.css';
import { useCookies } from "react-cookie";

const BASE_URL = "https://physical-track.site";
const TEST_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkZXZpY2VJZCI6ImRldmljZTEyMzQ1Njc4OSIsInVzZXJJZCI6NSwibmFtZSI6Iu2Zjeq4uOuPmSIsImlhdCI6MTczMDk4NzMyMywiZXhwIjoxOTkwMTg3MzIzfQ.r_REPaYe8UGXiWJ92Gseo_wp7rSNl5RMtjhxUpYCxXw";

// 푸시업에 대한 등급 기준선
const pushupLevels = [
  { value: 48, label: "3급", color: "#ff7979" },
  { value: 56, label: "2급", color: "#f39c12" },
  { value: 64, label: "1급", color: "#2ecc71" },
  { value: 72, label: "특급", color: "#3498db" },
];

// 페이스 데이터 예시 (구간별 속도)
const paceData = [
  { 구간: "0", 속도: 0 },
  { 구간: "30", 속도: 20 },
  { 구간: "60", 속도: 21 },
  { 구간: "90", 속도: 17 },
  { 구간: "120s", 속도: 15 }
];

function MainPage() {
  const [cookies] = useCookies(["access_token", "user_id, user_name"]);
  const [statistics, setStatistics] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [data7Days, setData7Days] = useState([]);
  const [loading, setLoading] = useState(true); // 로딩 상태 추가

  const userid = cookies.user_id;

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!userid) {
        setErrorMessage("사용자 ID가 설정되지 않았습니다.");
        return;
      }
      try {
        const response = await axios.get(`${BASE_URL}/api/statistics/weekly-stats/${userid}`, {
          headers: {
            Authorization: `Bearer ${cookies.access_token}`,
          },
        });

        const pushupStats = response.data.data.pushupStats;

        // 오늘 날짜 계산
        const today = new Date();

        // 최근 7일 날짜 배열 생성
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (6 - i)); // 오늘부터 6일 전까지
          return date.toISOString().split("T")[0];
        });

        // 날짜별 데이터를 0으로 초기화 후 서버 데이터를 매칭
        const completeData = last7Days.map((date) => {
          const record = pushupStats.find((item) => item.date === date);
          return { date, 횟수: record ? record.quantity : 0 };
        });

        // 상태 업데이트
        setData7Days(completeData);
        setStatistics(response.data); // 통계 데이터 저장
      } catch (error) {
        console.error("서버 통신 오류:", error);
        setErrorMessage("데이터를 가져오는 데 실패했습니다. 다시 시도해주세요.");
      } finally {
        setLoading(false); // 로딩 상태 완료
      }
    };

    fetchStatistics();
  }, [userid, cookies.access_token]);

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data7Days}>
        <CartesianGrid vertical={false} stroke="#444" />
        <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 6 }} interval={0} />
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
        <XAxis dataKey="구간" interval={0} tick={{ fontSize: 10 }} /> {/* 글자 크기 조정 */}
        <YAxis domain={[0, 20]} />
        <Tooltip />
        <Line type="monotone" dataKey="속도" stroke="#82ca9d" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>{cookies.user_name}님 통계</h2>
      </header>

      <div>
        {errorMessage && <p>{errorMessage}</p>}
        {!statistics && !errorMessage && <p>데이터 로딩 중...</p>}
      </div>

      <div style={styles.content}>
        <div style={styles.chartSection}>
          <h3 style={styles.sectionTitle}>최근 7일 운동</h3>
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
    </div>
  );
}

// 날짜별 운동 기록 페이지 컴포넌트
function DailyRecordPage() {
  const [cookies] = useCookies(["access_token", "user_id", "user_name"]);
  const [date, setDate] = useState(new Date());
  const [exerciseData, setExerciseData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const userid = cookies.user_id;

  const addNineHours = (utcDate) => {
    const date = new Date(utcDate);
    return new Date(date.getTime() + 9 * 60 * 60 * 1000) // 9시간 추가
      .toISOString()
      .split("T")[0]; // "YYYY-MM-DD" 형식으로 반환
  };

  useEffect(() => {
    const fetchExerciseData = async () => {
      if (!userid) {
        setErrorMessage("사용자 ID가 설정되지 않았습니다.");
        return;
      }
      try {
        const response = await axios.get(`${BASE_URL}/api/statistics/weekly-stats/${userid}`, {
          headers: {
            Authorization: `Bearer ${cookies.access_token}`,
          },
        });

        const pushupStats = response.data.data.pushupStats.map((item) => ({
          ...item,
          date: addNineHours(item.date), // 9시간 추가
        }));

        setExerciseData(pushupStats);
        setErrorMessage("");
      } catch (error) {
        console.error("서버 통신 오류:", error);
        setErrorMessage("데이터를 가져오는 데 실패했습니다. 다시 시도해주세요.");
      }
    };

    fetchExerciseData();
  }, [userid, cookies.access_token]);

  useEffect(() => {
    if (date) {
      const formattedDate = addNineHours(date.toISOString());
      const record = exerciseData.find((item) => item.date === formattedDate);
      setSelectedRecord(record || null);
    }
  }, [date, exerciseData]);

  const calculateGrade = (count) => {
    if (count >= pushupLevels[3].value) return "특급";
    if (count >= pushupLevels[2].value) return "1급";
    if (count >= pushupLevels[1].value) return "2급";
    if (count >= pushupLevels[0].value) return "3급";
    return "불합격";
  };

  const tileContent = ({ date, view }) => {
    if (view === "month") {
      // 캘린더의 날짜에 9시간 추가
      const formattedDate = addNineHours(date.toISOString());
      const hasRecord = exerciseData.some((record) => record.date === formattedDate);

      if (hasRecord) {
        return (
          <div
            style={{
              position: "absolute",
              bottom: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              color: "#3498db",
              fontSize: "16px",
            }}
          >
            •
          </div>
        );
      }
    }
    return null; // 점 표시하지 않음
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
        <XAxis dataKey="구간" interval={0} tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 20]} />
        <Tooltip />
        <Line type="monotone" dataKey="속도" stroke="#82ca9d" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>{cookies.user_name}님 캘린더</h2>
      </header>

      <div style={styles.content}>
        <div style={styles.calendarSection}>
          <Calendar
            onChange={setDate}
            value={date}
            tileContent={tileContent} // 점 표시 추가
            tileDisabled={tileDisabled} // 현재 월 외의 날짜 비활성화
            showNeighboringMonth={false} // 인접 월 숨김
          />
        </div>

        <div style={styles.recordSection}>
          {errorMessage ? (
            <p>{errorMessage}</p>
          ) : selectedRecord ? (
            <>
              <h3 style={styles.sectionTitle}>선택한 날짜의 운동 기록</h3>
              <p>날짜: {selectedRecord.date}</p>
              <p>횟수: {selectedRecord.quantity}</p>
              <p>등급: {calculateGrade(selectedRecord.quantity)}</p>
            </>
          ) : (
            <p>해당 날짜의 운동 기록이 없습니다.</p>
          )}
        </div>

        <div style={styles.chartSection}>
          <h3 style={styles.sectionTitle}>페이스</h3>
          <span style={styles.description}>구간 별로 회원님의 운동 속도를 측정했어요</span>
          <div style={styles.chartContainer}>{renderLineChart()}</div>
        </div>
      </div>
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
