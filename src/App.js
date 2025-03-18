import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from "react-router-dom";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
import { useCookies } from "react-cookie";
import "./Calendar.css";

// -------------------- 전역 상수 및 등급 기준 --------------------
const BASE_URL = "https://physical-track.site";
const TEST_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkZXZpY2VJZCI6ImRldmljZTEyMzQ1Njc4OSIsInVzZXJJZCI6NSwibmFtZSI6Iu2Zjeq4uOuPmSIsImlhdCI6MTczMDk4NzMyMywiZXhwIjoxOTkwMTg3MzIzfQ.r_REPaYe8UGXiWJ92Gseo_wp7rSNl5RMtjhxUpYCxXw";

// 푸시업에 대한 등급 기준선 (특급 → 1급 → 2급 → 3급)
const pushupLevels = [
  { value: 72, label: "특급", color: "#3498db" },
  { value: 64, label: "1급", color: "#2ecc71" },
  { value: 56, label: "2급", color: "#f39c12" },
  { value: 48, label: "3급", color: "#ff7979" },
];

// 달리기 등급 기준선 (초 단위) (특급 → 1급 → 2급 → 3급)
// 12분30초=750, 13분32초=812, 14분34초=874, 15분36초=936
const runningLevels = [
  { value: 750, label: "특급", color: "#3498db" },
  { value: 812, label: "1급", color: "#2ecc71" },
  { value: 874, label: "2급", color: "#f39c12" },
  { value: 936, label: "3급", color: "#ff7979" },
];

// 초 단위를 "분:초" 문자열로 변환하는 함수
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// -------------------- 스타일 객체 --------------------
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
  tabContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },
  activeTab: {
    padding: "10px 20px",
    margin: "0 5px",
    backgroundColor: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
  },
  inactiveTab: {
    padding: "10px 20px",
    margin: "0 5px",
    backgroundColor: "#444",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
  },
  content: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: "10px",
    padding: "20px",
  },
  chartSection: {
    marginBottom: "20px",
  },
  chartContainer: {
    width: "100%",
    height: "250px",
  },
  buttonSection: {
    textAlign: "center",
    marginTop: "20px",
  },
  button: {
    padding: "15px 25px",
    backgroundColor: "#444",
    border: "none",
    borderRadius: "25px",
    color: "#fff",
    fontSize: "1em",
    textDecoration: "none",
    cursor: "pointer",
  },
  calendarSection: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "center",
  },
  recordSection: {
    marginBottom: "20px",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: "1.2em",
    marginBottom: "10px",
  },
};

// -------------------- 메인 통계 페이지(탭) --------------------
function StatisticsPage() {
  const [activeTab, setActiveTab] = useState("pushup");
  const [cookies] = useCookies(["user_name"]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div style={styles.container}>
      {/* 상단 제목 */}
      <header style={styles.header}>
        <h2 style={styles.title}>
          {cookies.user_name ? `${cookies.user_name}님 통계` : "???님 통계"}
        </h2>
      </header>

      {/* 탭 버튼 */}
      <div style={styles.tabContainer}>
        <button
          style={activeTab === "pushup" ? styles.activeTab : styles.inactiveTab}
          onClick={() => handleTabChange("pushup")}
        >
          푸시업
        </button>
        <button
          style={activeTab === "running" ? styles.activeTab : styles.inactiveTab}
          onClick={() => handleTabChange("running")}
        >
          달리기
        </button>
        <button
          style={activeTab === "situp" ? styles.activeTab : styles.inactiveTab}
          onClick={() => handleTabChange("situp")}
        >
          윗몸일으키기
        </button>
      </div>

      {/* 탭별 컴포넌트 표시 */}
      <div style={styles.content}>
        {activeTab === "pushup" && <PushupStatistics />}
        {activeTab === "running" && <RunningStatistics />}
        {activeTab === "situp" && <SitupStatistics />}
      </div>
    </div>
  );
}

// -------------------- 푸시업 통계 탭 --------------------
function PushupStatistics() {
  const [cookies, setCookie] = useCookies(["access_token", "user_id", "user_name"]);
  const [data7Days, setData7Days] = useState([]); // [{ date, 횟수 }, ...]
  const [paceData, setPaceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const userid = cookies.user_id;
  //const userid = cookies.user_id || 8;

  // -------------------- A) 주간(7일) 통계 -> weekly-stats --------------------
  useEffect(() => {
    const fetchStatistics = async () => {
      if (!userid) {
        setErrorMessage("사용자 ID가 설정되지 않았습니다.");
        return;
      }
      try {
        const response = await axios.get(
          `${BASE_URL}/api/statistics/weekly-stats/${userid}`,
          {
            headers: {
              Authorization: `Bearer ${cookies.access_token}`
              //Authorization: `Bearer ${TEST_TOKEN}`
            },
          }
        );

        // 서버 응답에서 pushupStats, name 추출
        const { pushupStats, name } = response.data.data;
        if (name && !cookies.user_name) {
          setCookie("user_name", name, { path: "/" });
        }

        // 최근 7일 날짜 배열
        const today = new Date();
        today.setHours(today.getHours() + 9);
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (6 - i));
          return d.toISOString().split("T")[0];
        });

        // 날짜별로 매칭 -> quantity=0이면 null 처리
        const completeData = last7Days.map((dateStr) => {
          const record = pushupStats.find((item) => item.date === dateStr);
          // 0개 -> null(기록 없음)
          const qty = record && record.quantity > 0 ? record.quantity : null;
          return { date: dateStr, 횟수: qty };
        });

        setData7Days(completeData);
        setErrorMessage("");
      } catch (error) {
        console.error("주간 푸시업 데이터 불러오기 실패:", error);
        setErrorMessage("주간 푸시업 데이터를 가져오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [userid, cookies.user_name, setCookie]);

  // -------------------- B) 막대 클릭 -> 해당 날짜 일일 페이스 --------------------
  const handleBarClick = (barData) => {
    if (!barData || !barData.date || barData.횟수 == null) {
      // 횟수= null => 기록 없음
      setSelectedDate(barData?.date || null);
      setPaceData([]);
      setErrorMessage("운동 기록이 없습니다.");
      return;
    }
    setSelectedDate(barData.date);
    fetchPaceData(barData.date);
  };

  // 특정 날짜의 푸시업 페이스
  const fetchPaceData = async (dateStr) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/statistics/daily-stats/${userid}/${dateStr}`,
        {
          headers: {
            Authorization: `Bearer ${cookies.access_token}`
            //Authorization: `Bearer ${TEST_TOKEN}`
          }
        }
      );
      const rawData = response.data.data?.pushupTempo;
      if (rawData && rawData.length > 0) {
        const simplifiedData = calculatePushupsPerInterval(rawData);
        setPaceData(simplifiedData);
        setErrorMessage("");
      } else {
        setPaceData([]);
        setErrorMessage("페이스 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("페이스 데이터를 가져오는 데 실패:", error);
      setPaceData([]);
      setErrorMessage("페이스 데이터를 가져오는 데 실패했습니다.");
    }
  };

  // 0~30, 30~60, 60~90, 90~120 구간별 푸시업 개수
  function calculatePushupsPerInterval(timePoints) {
    const intervals = [0, 30, 60, 90, 120];
    return intervals.map((start, idx) => {
      const end = intervals[idx + 1] || 120;
      const pushupsInInterval = timePoints.filter((t) => t >= start && t < end).length;
      return { time: start, 속도: pushupsInInterval };
    });
  }

  // -------------------- C) 주간 차트 --------------------
  // 모두 null => "주간 푸시업 데이터가 없습니다."
  const hasAnyData = data7Days.some((d) => d.횟수 !== null);

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data7Days}
        onClick={(e) => {
          if (e?.activePayload?.[0]?.payload) {
            handleBarClick(e.activePayload[0].payload);
          }
        }}
      >
        <CartesianGrid vertical={false} stroke="#444" />
        <XAxis
          dataKey="date"
          tickFormatter={(dateStr) => {
            const [year, month, day] = dateStr.split("-");
            return `${month}-${day}`;
          }}
          stroke="#888"
          tick={{ fontSize: 10 }}
          interval={0}
        />
        <YAxis
          domain={[40, 80]}
          tick={false}
          axisLine={false}
          tickLine={false}
          stroke="#888"
        />
        {/* null => "No data" */}
        <Tooltip formatter={(value) => (value == null ? "No data" : value)} />

        {/* 푸시업 기준선 */}
        {pushupLevels.map((line, idx) => (
          <ReferenceLine
            key={idx}
            y={line.value}
            label={{ position: "left", value: line.label, fill: line.color }}
            stroke={line.color}
            strokeDasharray="3 3"
          />
        ))}

        {/* 막대: null이면 표시 안 됨 */}
        <Bar dataKey="횟수" fill="#3498db" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  // -------------------- D) 일일 페이스 차트 --------------------
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={paceData} margin={{ right: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          interval={0}
          label={{ value: "시간 (초)", position: "insideBottom", offset: -3 }}
        />
        <YAxis
          allowDecimals={false}
          label={{
            value: "속도 (개)",
            angle: -90,
            position: "insideLeft",
            offset: 20,
          }}
        />
        <Tooltip formatter={(val) => `${val} 개`} />
        <Line type="monotone" dataKey="속도" stroke="#82ca9d" dot />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div style={styles.content}>
      <div style={styles.chartSection}>
        <h3 style={styles.sectionTitle}>최근 7일 푸시업</h3>

        {!hasAnyData ? (
          <p>주간 푸시업 데이터가 없습니다.</p>
        ) : (
          <div style={styles.chartContainer}>{renderBarChart()}</div>
        )}
      </div>

      <div style={styles.chartSection}>
        <h3 style={styles.sectionTitle}>
          {selectedDate
            ? `${selectedDate} 푸시업 페이스`
            : "막대 그래프에서 날짜를 선택하세요"}
        </h3>
        {paceData.length > 0 ? (
          renderLineChart()
        ) : (
          <p>페이스 데이터가 없습니다.</p>
        )}
      </div>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      <div style={styles.buttonSection}>
        <Link to="/daily-record" style={styles.button}>
          날짜별 운동 기록 보기
        </Link>
      </div>
    </div>
  );
}

// -------------------- 달리기 통계 탭 --------------------
function RunningStatistics() {
  const [cookies, setCookie] = useCookies(["access_token", "user_id", "user_name"]);
  const [weeklyData, setWeeklyData] = useState([]); // [{ date, time }, ...] (time=null => no data)
  const [segmentData, setSegmentData] = useState([]); // 일일 러닝 1/2/3km
  const [selectedDate, setSelectedDate] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const userid = cookies.user_id;

  useEffect(() => {
    if (!userid) {
      setErrorMessage("사용자 ID가 설정되지 않았습니다.");
      return;
    }
    const today = new Date();
    today.setHours(today.getHours() + 9);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    fetchWeeklyFromDaily(last7Days);
  }, [userid]);

  async function fetchWeeklyFromDaily(dateArray) {
    try {
      const results = [];
      for (const dateStr of dateArray) {
        const dayResult = await fetchDailyLastValue(dateStr);
        results.push(dayResult); // { date, time }
      }
      setWeeklyData(results);
      setErrorMessage("");
    } catch (error) {
      console.error("주간 러닝 데이터를 가져오는 데 실패:", error);
      setErrorMessage("주간 러닝 데이터를 가져오는 데 실패했습니다.");
    }
  }

  // DB에는 100m 구간별 '개별 시간'이 들어있으므로, 합산해서 3km 시간 계산
  async function fetchDailyLastValue(dateStr) {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/statistics/daily-stats/${userid}/${dateStr}`,
        {
          headers: {
            Authorization: `Bearer ${cookies.access_token}`,
          },
        }
      );
      const rawArray = response.data.data?.runningTempo;
      if (rawArray && rawArray.length === 30) {
        // 30개 (각 100m별 소요 시간)
        // 3km 전체 시간 = sum of all 30
        const totalSec = rawArray.reduce((acc, cur) => acc + cur, 0);
        return { date: dateStr, time: totalSec };
      } else {
        return { date: dateStr, time: null };
      }
    } catch (error) {
      return { date: dateStr, time: null };
    }
  }

  const handleWeekClick = (data) => {
    if (!data || !data.date || data.time === null) {
      setSelectedDate(data?.date || null);
      setSegmentData([]);
      setErrorMessage("운동 기록이 없습니다.");
      return;
    }
    setSelectedDate(data.date);
    fetchDailySegments(data.date);
  };

  async function fetchDailySegments(dateStr) {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/statistics/daily-stats/${userid}/${dateStr}`,
        {
          headers: {
            Authorization: `Bearer ${cookies.access_token}`,
          },
        }
      );
      const rawArray = response.data.data?.runningTempo;
      if (rawArray && rawArray.length === 30) {
        // ----- ★ 수정: 구간별 시간(각 100m)에 대해 10개씩 합산 → 1km
        setSegmentData(makeThreeSegments(rawArray));
        setErrorMessage("");
      } else {
        setSegmentData([]);
        setErrorMessage("일일 러닝 구간 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("일일 러닝 구간 가져오기 실패:", error);
      setSegmentData([]);
      setErrorMessage("일일 러닝 구간 데이터를 가져오는 데 실패했습니다.");
    }
  }

  // ----- ★ 여기서 개별시간(100m 단위)을 합산
  function makeThreeSegments(arr) {
    // arr: 길이 30, 각 원소가 "100m 달리는 데 걸린 시간(초)"
    // 1km = arr[0..9] 합산, 2km = arr[10..19], 3km = arr[20..29]
    const segments = [];
    for (let i = 0; i < 3; i++) {
      let sumSec = 0;
      for (let j = i * 10; j < i * 10 + 10; j++) {
        sumSec += arr[j];
      }
      segments.push({
        km: i + 1,
        pace: convertSecondsToPace(sumSec),
      });
    }
    return segments;
  }

  // 초 → "m'ss.s''" 형태
  function convertSecondsToPace(sec) {
    if (sec == null) return "No data";
    const m = Math.floor(sec / 60);
    const remainder = sec - m * 60;
    let sDecimal = remainder.toFixed(1);
    if (remainder < 10) sDecimal = "0" + sDecimal;
    if (sDecimal.endsWith(".0")) sDecimal = sDecimal.slice(0, -2);
    return `${m}'${sDecimal}''`;
  }

  function formatSecondsOrNoData(val) {
    if (val == null) return "";
    const mm = Math.floor(val / 60);
    const ss = Math.floor(val % 60);
    return `${mm}:${ss < 10 ? "0" : ""}${ss}`;
  }

  function tooltipFormatter(val) {
    if (val == null) return "No data";
    const mm = Math.floor(val / 60);
    const ss = Math.floor(val % 60);
    return `${mm}:${ss < 10 ? "0" : ""}${ss}`;
  }

  const hasAnyData = weeklyData.some((d) => d.time !== null);

  return (
    <div style={styles.content}>
      <div style={styles.chartSection}>
        <h3 style={styles.sectionTitle}>최근 7일 러닝 기록</h3>
        {!hasAnyData ? (
          <p>주간 러닝 데이터가 없습니다.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={weeklyData}
              onClick={(e) =>
                e?.activePayload?.[0]?.payload
                  ? handleWeekClick(e.activePayload[0].payload)
                  : null
              }
            >
              <CartesianGrid vertical={false} stroke="#444" />
              <XAxis
                dataKey="date"
                tickFormatter={(dateStr) => dateStr.substring(5)}
                stroke="#888"
                tick={{ fontSize: 10 }}
              />
              <YAxis
                domain={[700, 980]}
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={tooltipFormatter} />
              {runningLevels.map((line, idx) => (
                <ReferenceLine
                  key={idx}
                  y={line.value}
                  label={{ position: "left", value: line.label, fill: line.color }}
                  stroke={line.color}
                  strokeDasharray="3 3"
                />
              ))}
              <Line
                type="monotone"
                dataKey="time"
                stroke="#e67e22"
                activeDot={{ r: 8 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.chartSection}>
        <h3 style={styles.sectionTitle}>
          {selectedDate ? `${selectedDate} 러닝 구간` : "주간 기록을 클릭하세요"}
        </h3>
        {segmentData.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #999" }}>
                  <th style={{ padding: "8px" }}>KM</th>
                  <th style={{ padding: "8px" }}>평균 페이스</th>
                </tr>
              </thead>
              <tbody>
                {segmentData.map((seg, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      {seg.km} km
                    </td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      {seg.pace}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>일일 러닝 구간 데이터가 없습니다.</p>
        )}
      </div>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <div style={styles.buttonSection}>
        <Link to="/daily-record" style={styles.button}>
          날짜별 운동 기록 보기
        </Link>
      </div>
    </div>
  );
}

// -------------------- 윗몸일으키기 통계 탭 --------------------
function SitupStatistics() {
  return (
    <div style={{ padding: "10px" }}>
      <h3>윗몸일으키기 통계 그래프 및 데이터 (추가 구현 예정)</h3>
    </div>
  );
}

// -------------------- 날짜별 운동 기록 페이지 --------------------
function DailyRecordPage() {
  const [cookies] = useCookies(["access_token", "user_id", "user_name"]);
  const [date, setDate] = useState(new Date());

  // 푸시업/러닝 주간 데이터를 각각 저장
  const [pushupData, setPushupData] = useState([]);
  const [runningData, setRunningData] = useState([]);

  // 선택한 날짜의 푸시업/러닝 기록
  const [selectedPushup, setSelectedPushup] = useState(null);
  const [selectedRunning, setSelectedRunning] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");

  const userid = cookies.user_id;
  //const userid = cookies.user_id || 8;

  // 로컬 Date → "YYYY-MM-DD"
  function formatLocalDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // (A) 주간 푸시업+러닝 데이터 가져오기 (weekly-stats)
  useEffect(() => {
    const fetchWeeklyStats = async () => {
      if (!userid) {
        setErrorMessage("사용자 ID가 설정되지 않았습니다.");
        return;
      }
      try {
        const response = await axios.get(
          `${BASE_URL}/api/statistics/weekly-stats/${userid}`,
          {
            headers: {
              Authorization: `Bearer ${cookies.access_token}`
              //Authorization: `Bearer ${TEST_TOKEN}`,
            },
          }
        );

        // 서버 응답에서 pushupStats, runningStats 추출
        const { pushupStats, runningStats } = response.data.data;

        // 날짜(YYYY-MM-DD)만 그대로 사용 (추가 9시간 X)
        const newPushupData = pushupStats.map((item) => ({
          date: item.date,
          quantity: item.quantity,
        }));
        const newRunningData = runningStats.map((item) => ({
          date: item.date,
          time: item.time, // 3km 걸린 시간(초)
        }));

        setPushupData(newPushupData);
        setRunningData(newRunningData);
        setErrorMessage("");
      } catch (error) {
        console.error("주간 데이터 불러오기 실패:", error);
        setErrorMessage("데이터를 가져오는 데 실패했습니다.");
      }
    };

    fetchWeeklyStats();
  }, [userid]);

  // (B) 달력에서 날짜 선택 => 푸시업/러닝 기록 찾기
  useEffect(() => {
    if (date) {
      const formattedDate = formatLocalDate(date);

      // 푸시업 기록
      const pRecord = pushupData.find((item) => item.date === formattedDate);
      setSelectedPushup(pRecord || null);

      // 러닝 기록
      const rRecord = runningData.find((item) => item.date === formattedDate);
      setSelectedRunning(rRecord || null);
    }
  }, [date, pushupData, runningData]);

  // (C) 달력 타일 표시
  //   - 푸시업 있으면 파란 점
  //   - 러닝 있으면 노란 점
  //   - 둘 다 있으면 2개
  const tileContent = ({ date: tileDate, view }) => {
    if (view === "month") {
      const localDate = formatLocalDate(tileDate);
      const hasPushup = pushupData.some((p) => p.date === localDate);
      const hasRunning = runningData.some((r) => r.date === localDate);
      if (!hasPushup && !hasRunning) return null;
      return (
        <div style={{ position: "absolute", top: 0, right: 0, width: "100%", height: "100%" }}>
          {hasPushup && (
            <div
              style={{
                position: "absolute",
                top: "5%",
                left: "5%",
                color: "#3498db", // 파란색
                fontSize: "12px",
              }}
            >
              •
            </div>
          )}
          {hasRunning && (
            <div
              style={{
                position: "absolute",
                top: "5%",
                right: "5%",
                color: "yellow", // 노란색
                fontSize: "12px",
              }}
            >
              •
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // (D) 등급 계산
  function calculatePushupGrade(count) {
    if (count >= pushupLevels[0].value) return "특급";
    if (count >= pushupLevels[1].value) return "1급";
    if (count >= pushupLevels[2].value) return "2급";
    if (count >= pushupLevels[3].value) return "3급";
    return "불합격";
  }
  function calculateRunningGrade(time) {
    // time(초)이 특급(750) 이하인지,
    if (time <= runningLevels[0].value) return "특급";
    if (time <= runningLevels[1].value) return "1급";
    if (time <= runningLevels[2].value) return "2급";
    if (time <= runningLevels[3].value) return "3급";
    return "불합격";
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>
          {cookies.user_name ? `${cookies.user_name}님 캘린더` : "???님 캘린더"}
        </h2>
      </header>

      <div style={styles.content}>
        {/* 달력 */}
        <div style={styles.calendarSection}>
          <Calendar
            onChange={setDate}
            value={date}
            tileContent={tileContent}
            showNeighboringMonth={false}
          />
        </div>

        {/* 선택한 날짜 기록 (푸시업 + 러닝), 페이스 차트 제거 */}
        <div style={styles.recordSection}>
          {errorMessage ? (
            <p>{errorMessage}</p>
          ) : (
            <>
              <h3 style={styles.sectionTitle}>
                선택한 날짜: {formatLocalDate(date)}
              </h3>

              {/* 푸시업 */}
              {selectedPushup ? (
                <>
                  <p>푸시업 횟수: {selectedPushup.quantity}</p>
                  <p>등급: {calculatePushupGrade(selectedPushup.quantity)}</p>
                </>
              ) : (
                <p>푸시업 기록 없음</p>
              )}

              {/* 러닝 */}
              {selectedRunning ? (
                <>
                  <p>러닝 시간(3km): {selectedRunning.time} 초</p>
                  <p>등급: {calculateRunningGrade(selectedRunning.time)}</p>
                </>
              ) : (
                <p>러닝 기록 없음</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------- 라우팅 --------------------
// 구버전 앱 컴포넌트 (예: 구버전은 기존 코드 그대로)
function OldVersionApp() {
  return (
    <Routes>
      <Route path="/" element={<StatisticsPage />} />
      <Route path="/daily-record" element={<DailyRecordPage />} />
    </Routes>
  );
}

// 신버전 앱 컴포넌트 (원하는 대로 수정 가능, 여기서는 예시로 구버전과 동일하게 처리)
function NewVersionApp() {
  return (
    <Routes>
      <Route path="/v1" element={<StatisticsPage />} />
      <Route path="/v1/daily-record" element={<DailyRecordPage />} />
    </Routes>
  );
}

// 메인 App 컴포넌트에서 경로를 분리하여 배포합니다.
function App() {
  return (
    <Router>
      <Routes>
        {/* 구버전: 기존 URL 그대로 */}
        <Route path="/*" element={<OldVersionApp />} />
        {/* 신버전: /v1 하위 경로 */}
        <Route path="/v1/*" element={<NewVersionApp />} />
      </Routes>
    </Router>
  );
}

export default App;
