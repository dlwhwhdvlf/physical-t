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

function MainPage() {
  const [cookies] = useCookies(["access_token", "user_id, user_name"]);
  const [statistics, setStatistics] = useState(null);
  const [data7Days, setData7Days] = useState([]);
  const [paceData, setPaceData] = useState([]); // 특정 날짜의 페이스 데이터 상태
  const [selectedDate, setSelectedDate] = useState(null); // 선택된 날짜
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true); // 로딩 상태 추가

  const userid = cookies.user_id;
  //const userid = 8; // 하드코딩된 사용자 ID

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
            //Authorization: `Bearer ${TEST_TOKEN}`,
          },
        });

        const pushupStats = response.data.data.pushupStats;

        // 오늘 날짜 계산
        const today = new Date();
        today.setHours(today.getHours() + 9); // 9시간 추가
        const formattedToday = today.toISOString().split("T")[0];

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
  }, [userid]);

  // 데이터를 4개 구간으로 나누는 함수
  const simplifyDataToFourSegments = (data) => {
    const segments = [
      { range: "0", values: [] },
      { range: "60", values: [] },
      { range: "90", values: [] },
      { range: "120s", values: [] },
    ];

    // 데이터를 구간별로 분배
    data.forEach((value, index) => {
      const second = index + 1; // 1초부터 시작
      if (second <= 30) {
        segments[0].values.push(value);
      } else if (second <= 60) {
        segments[1].values.push(value);
      } else if (second <= 90) {
        segments[2].values.push(value);
      } else {
        segments[3].values.push(value);
      }
    });

    // 각 구간의 평균값 계산
    const simplifiedData = segments.map((segment) => ({
      구간: segment.range,
      속도: segment.values.length > 0
        ? segment.values.reduce((sum, val) => sum + val, 0) / segment.values.length
        : 0,
    }));

    return simplifiedData;
  };

  // FetchPaceData 함수에서 간소화된 데이터를 적용
  const fetchPaceData = async (date) => {
    const formattedDate = new Date(date).toISOString().split("T")[0]; // YYYY-MM-DD 형식
    console.log(`Fetching pace data for user ${userid} on date ${formattedDate}`);

    try {
      const response = await axios.get(
        `${BASE_URL}/api/statistics/daily-stats/${userid}/${formattedDate}`, // 경로에 userId와 date 포함
        {
          headers: {
            Authorization: `Bearer ${cookies.access_token}`,
            //Authorization: `Bearer ${TEST_TOKEN}`,
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data && response.data.data && response.data.data.pushupTempo) {
        const rawData = response.data.data.pushupTempo; // 원본 데이터

        // 구간별로 나누는 작업
        const simplifiedData = calculatePushupsPerInterval(rawData);

        setPaceData(simplifiedData); // 간소화된 페이스 데이터 설정
        setErrorMessage("");
      } else {
        setPaceData([]);
        setErrorMessage("페이스 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("Error fetching pace data:", error);
      setErrorMessage("페이스 데이터를 가져오는 데 실패했습니다.");
    }
  };

  // 30초 구간별 푸시업 완료 개수를 계산
  const calculatePushupsPerInterval = (timePoints) => {
    const intervals = [0, 30, 60, 90, 120];
    const result = intervals.map((start, index) => {
      const end = intervals[index + 1] || 120; // 마지막 구간은 120까지
      const pushupsInInterval = timePoints.filter((time) => time >= start && time < end).length; // 범위를 수정
      return { time: start, 속도: pushupsInInterval }; // `time`을 시작점으로 설정
    });

    return result;
  };

  // 그래프 렌더링 코드 (구간 단순화 반영)
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={paceData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"

          interval={0}

          label={{ value: "시간 (초)", position: "insideBottom", offset: -1 }}
        />
        <YAxis allowDecimals={false} label={{ value: "속도 (개)", angle: -90, position: "insideLeft", offset: 20 }} />
        <Tooltip formatter={(value) => `${value} 개`} />
        <Line type="monotone" dataKey="속도" stroke="#82ca9d" dot />
      </LineChart>
    </ResponsiveContainer>
  );


  const handleBarClick = (data) => {
    if (data && data.date) {
      console.log("클릭된 데이터:", data);
      setSelectedDate(data.date); // 선택된 날짜 상태 업데이트
      fetchPaceData(data.date); // 해당 날짜의 페이스 데이터 로드
    } else {
      console.log("클릭된 데이터가 없습니다.");
    }
  };


  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data7Days}
        onClick={(e) => handleBarClick(e?.activePayload?.[0]?.payload)} // 이벤트 수정
      >
        <CartesianGrid vertical={false} stroke="#444" />
        <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 6 }} interval={0} />
        <YAxis
          domain={[40, 80]} // 고정된 Y축 범위 설정
          ticks={[pushupLevels[0].value, pushupLevels[1].value, pushupLevels[2].value, pushupLevels[3].value]}
          tick={false} // 회색 눈금 제거
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

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>{cookies.user_name || "???"}님 통계</h2>
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
          <h3 style={styles.sectionTitle}>
            {selectedDate ? `${selectedDate}` : "막대 그래프에서 날짜를 선택하세요"}
          </h3>
          {paceData.length > 0 ? renderLineChart() : <p>페이스 데이터가 없습니다.</p>}
        </div>

        <div style={styles.buttonSection}>
          <Link to="/daily-record" style={styles.button}>
            날짜별 운동 기록 보기
          </Link>
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
  const [paceData, setPaceData] = useState([]); // 페이스 데이터 상태 추가
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [paceErrorMessage, setPaceErrorMessage] = useState(""); // 페이스 데이터 에러 메시지

  const userid = cookies.user_id;
  //const userid = 8; // 하드코딩된 사용자 ID

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
            //Authorization: `Bearer ${TEST_TOKEN}`,
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
      fetchPaceData(formattedDate); // 페이스 데이터 로드
    }
  }, [date, exerciseData]);

  // 선택한 날짜의 페이스 데이터를 서버에서 가져오는 함수
  const fetchPaceData = async (selectedDate) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/statistics/daily-stats/${userid}/${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${TEST_TOKEN}`,
          },
        }
      );

      if (response.data && response.data.data && response.data.data.pushupTempo) {
        const rawData = response.data.data.pushupTempo;

        // 구간별 데이터를 정리
        const simplifiedData = calculatePushupsPerInterval(rawData);
        setPaceData(simplifiedData); // 페이스 데이터 상태 업데이트
        setPaceErrorMessage("");
      } else {
        setPaceData([]);
        setPaceErrorMessage("페이스 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("페이스 데이터 로드 실패:", error);
      setPaceErrorMessage("페이스 데이터를 가져오는 데 실패했습니다.");
    }
  };

  // 30초 구간별 푸시업 완료 개수를 계산
  const calculatePushupsPerInterval = (timePoints) => {
    const intervals = [0, 30, 60, 90, 120];
    const result = intervals.map((start, index) => {
      const end = intervals[index + 1] || 120; // 마지막 구간은 120까지
      const pushupsInInterval = timePoints.filter((time) => time >= start && time < end).length; // 구간별 데이터
      return { 구간: `${start}`, 속도: pushupsInInterval };
    });

    return result;
  };

  const calculateGrade = (count) => {
    if (count >= pushupLevels[3].value) return "특급";
    if (count >= pushupLevels[2].value) return "1급";
    if (count >= pushupLevels[1].value) return "2급";
    if (count >= pushupLevels[0].value) return "3급";
    return "불합격";
  };

  const tileContent = ({ date, view }) => {
    if (view === "month") {
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
    return null;
  };

  const tileDisabled = ({ date, view }) => {
    if (view === "month") {
      const currentMonth = new Date().getMonth();
      return date.getMonth() !== currentMonth;
    }
    return false;
  };

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={250}>
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
        <h2 style={styles.title}>{cookies.user_name || "???"}님 캘린더</h2>
      </header>

      <div style={styles.content}>
        <div style={styles.calendarSection}>
          <Calendar
            onChange={setDate}
            value={date}
            tileContent={tileContent}
            tileDisabled={tileDisabled}
            showNeighboringMonth={false}
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
          {paceErrorMessage ? (
            <p>{paceErrorMessage}</p>
          ) : (
            <div style={styles.chartContainer}>{renderLineChart()}</div>
          )}
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
