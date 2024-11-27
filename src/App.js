import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from "recharts";
import './Calendar.css';
import { useCookies } from "react-cookie";

const BASE_URL = "http://3.36.72.104:8080";
const TEST_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkZXZpY2VJZCI6ImRldmljZTEyMzQ1Njc4OSIsInVzZXJJZCI6NSwibmFtZSI6Iu2Zjeq4uOuPmSIsImlhdCI6MTczMDk4NzMyMywiZXhwIjoxOTkwMTg3MzIzfQ.r_REPaYe8UGXiWJ92Gseo_wp7rSNl5RMtjhxUpYCxXw";

// 날짜별 운동 데이터 예시
/*const exerciseData = {
  "2024-11-01": { time: "02:00", count: 30, pace: 1.87 },
  "2024-11-02": { time: "02:00", count: 35, pace: 1.75 },
  "2024-11-03": { time: "02:00", count: 48, pace: 1.92 },
  "2024-11-04": { time: "02:00", count: 53, pace: 1.87 },
  "2024-11-05": { time: "02:00", count: 60, pace: 1.75 },
  "2024-11-06": { time: "02:00", count: 65, pace: 1.92 },
  "2024-11-07": { time: "02:00", count: 68, pace: 1.87 },

  "2024-11-09": { time: "02:00", count: 72, pace: 1.92 },
  "2024-11-10": { time: "02:00", count: 77, pace: 1.87 },
  "2024-11-11": { time: "02:00", count: 80, pace: 1.75 },

  // 추가적인 날짜별 데이터 입력 가능
};

// 7일간의 푸시업 예시 데이터
const data7Days = [
  { date: "08.06", 횟수: 48 },
  { date: "08.07", 횟수: 56 },
  { date: "08.08", 횟수: 64 },
  { date: "08.09", 횟수: 72 },
  { date: "08.10", 횟수: null },
  { date: "08.11", 횟수: 80 },
  { date: "08.12", 횟수: null },
];*/

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
  const [cookies] = useCookies(['access_token']);
  //const [cookies] = useCookies(["access_token", "userid"]);
  const [tokenMessage, setTokenMessage] = useState("");
  const [statistics, setStatistics] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [data7Days, setData7Days] = useState([]);
  const userid = 2; //cookies.userid; 쿠키에서 userid 추출


  useEffect(() => {
    const fetchStatistics = async () => {
      if (!userid) {
        setErrorMessage("사용자 ID가 설정되지 않았습니다.");
        return;
      }
      try {
        const response = await axios.get(`${BASE_URL}/api/statistics/weekly-stats/${userid}`, {
          headers: {
            Authorization: `Bearer ${TEST_TOKEN}`,
          },
        });
        // 서버 응답에서 필요한 데이터 추출
        const formattedData = response.data.data.pushupStats.map((item) => ({
          date: item.date, // 날짜 필드
          횟수: item.quantity, // 푸시업 횟수 필드
        }));

        // 상태 업데이트
        setStatistics(response.data);
        setData7Days(formattedData); // data7Days 업데이트
      } catch (error) {
        console.error("서버 통신 오류:", error);
        setErrorMessage("데이터를 가져오는 데 실패했습니다. 다시 시도해주세요.");
      }
    };

    fetchStatistics();
  }, []);


  // 버튼 클릭 시 쿠키의 access token을 가져오는 함수
  const handleShowToken = () => {
    const accessToken = cookies.access_token;
    setTokenMessage(accessToken ? `Access Token: ${accessToken}` : "토큰이 설정되지 않았습니다.");
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data7Days}>
        <CartesianGrid vertical={false} stroke="#444" />
        <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 10 }} />
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
        <h2 style={styles.title}>통계</h2>
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
  const [cookies] = useCookies(["access_token"]);
  //const [cookies] = useCookies(["access_token", "userid"]);
  const [date, setDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const userid = 2;//cookies.userid;  쿠키에서 userid 추출 우선 2로 하드코딩


  const calculateGrade = (count) => {
    if (count >= pushupLevels[3].value) return "특급";
    if (count >= pushupLevels[2].value) return "1급";
    if (count >= pushupLevels[1].value) return "2급";
    if (count >= pushupLevels[0].value) return "3급";
    return "불합격";
  };

  useEffect(() => {
    const fetchExerciseData = async () => {
      if (!userid) {
        setErrorMessage("사용자 ID가 설정되지 않았습니다.");
        return;
      }
      try {
        // API 요청
        const response = await axios.get(`${BASE_URL}/api/statistics/weekly-stats/${userid}`, {
          headers: {
            Authorization: `Bearer ${TEST_TOKEN}`,
          },
        });

        // 서버에서 받은 데이터 확인
        const pushupStats = response.data.data.pushupStats;

        // 캘린더에서 선택된 날짜와 매칭되는 데이터 찾기
        // 선택된 날짜를 9시간 추가한 후, "YYYY-MM-DD" 형식으로 변환
        const adjustedDate = new Date(date.getTime() + 9 * 60 * 60 * 1000); // 9시간(9 * 60 * 60 * 1000) 추가
        const formattedDate = adjustedDate.toISOString().split("T")[0];
        console.log("선택한 날짜:", formattedDate);
        console.log("서버 응답 데이터:", pushupStats);

        const record = pushupStats.find((item) => item.date === formattedDate);
        setSelectedRecord(record || null); // 데이터 없으면 null로 설정
        setErrorMessage(""); // 오류 메시지 초기화
      } catch (error) {
        console.error("서버 통신 오류:", error);
        setErrorMessage("데이터를 가져오는 데 실패했습니다. 다시 시도해주세요.");
        setSelectedRecord(null); // 오류 시 선택된 기록 초기화
      }
    };

    fetchExerciseData();
  }, [date, userid, cookies.access_token]); // date 변경 시 API 다시 호출

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

  const tileDisabled = ({ date, view }) => {
    if (view === "month") {
      const currentMonth = new Date().getMonth();
      return date.getMonth() !== currentMonth;
    }
    return false;
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>캘린더</h2>
      </header>

      <div style={styles.content}>
        <div style={styles.calendarSection}>
          <Calendar
            onChange={setDate} // 캘린더에서 날짜 선택 시 업데이트
            value={date}
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
              <p>날짜: {new Date(new Date(selectedRecord.date).setDate(new Date(selectedRecord.date).getDate())).toISOString().split("T")[0]}</p>
              <p>횟수: {selectedRecord.quantity}</p>
              <p>등급: {calculateGrade(selectedRecord.quantity)}</p>
              <p>평균 페이스: {selectedRecord.pace || "정보 없음"}</p>
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
