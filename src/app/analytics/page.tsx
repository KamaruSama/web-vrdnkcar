'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import Card, { CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Booking, Car } from '@/types';
import { SparklesIcon, LightBulbIcon } from '@heroicons/react/24/outline';

import AnalyticsHeader from '@/components/analytics/AnalyticsHeader';
import KpiCards from '@/components/analytics/KpiCards';
import OverviewTab from '@/components/analytics/OverviewTab';
import DriversTab from '@/components/analytics/DriversTab';
import TrendsTab from '@/components/analytics/TrendsTab';
import CategoriesTab from '@/components/analytics/CategoriesTab';
import CarStatsTab from '@/components/analytics/CarStatsTab';

import {
  SurveyData,
  AverageScores,
  DriverPerformance,
  TimelineData,
  ApprovalStatusData,
  TopRequesterData
} from '@/components/analytics/types';

// Custom hook for tracking scroll position
const useScrollPosition = () => {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      setScrollPosition(window.pageYOffset);
    };

    window.addEventListener("scroll", updatePosition);
    updatePosition();

    return () => window.removeEventListener("scroll", updatePosition);
  }, []);

  return scrollPosition;
};

export default function SurveyAnalyticsDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const scrollPosition = useScrollPosition();

  // Survey data state
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics data state
  const [averageScores, setAverageScores] = useState<AverageScores[]>([]);
  const [allDriverPerformance, setAllDriverPerformance] = useState<DriverPerformance[]>([]);
  const [filteredDriverPerformance, setFilteredDriverPerformance] = useState<DriverPerformance[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [topRequestersData, setTopRequestersData] = useState<TopRequesterData[]>([]);
  const [filteredTopRequestersData, setFilteredTopRequestersData] = useState<TopRequesterData[]>([]);

  // Filter state
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [driverSearchTerm, setDriverSearchTerm] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [requestersTimePeriod, setRequestersTimePeriod] = useState<string>('all');

  // Booking and car data state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);
  const [selectedCar, setSelectedCar] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);

  // Data fetching functions
  const fetchSurveys = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/survey');
      setSurveys(response.data.surveys || []);

      if (response.data.surveys && response.data.surveys.length > 0) {
        processInitialData(response.data.surveys);
      }
    } catch (err) {
      console.error('Error fetching surveys:', err);
      setError('ไม่สามารถโหลดข้อมูลแบบประเมินได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingData = async () => {
    try {
      const response = await axios.get('/api/booking');

      if (response.data && response.data.bookings && response.data.bookings.length > 0) {
        processApprovalStatusData(response.data.bookings);

        if (response.data.requesters && response.data.requesters.length > 0) {
          const requestersData: TopRequesterData[] = response.data.requesters
            .map((requester: any) => ({
              name: requester.requesterName || 'ไม่ระบุชื่อ',
              count: requester.bookingCount || 0,
              percentage: ((requester.bookingCount || 0) / response.data.bookings.length) * 100
            }))
            .slice(0, 5);

          setTopRequestersData(requestersData);
        } else {
          processTopRequestersData(response.data.bookings);
        }
      } else if (response.data.error) {
        createFallbackDataFromSurveys();
      } else {
        createFallbackDataFromSurveys();
      }
    } catch (err: any) {
      console.error('Error fetching booking data:', err);
      createFallbackDataFromSurveys();
    }
  };

  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      const response = await axios.get('/api/booking');
      setBookings(response.data.bookings || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchCars = async () => {
    try {
      setLoadingCars(true);
      const response = await axios.get('/api/car');
      setCars(response.data.cars || []);
    } catch (err) {
      console.error('Error fetching cars:', err);
    } finally {
      setLoadingCars(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchSurveys();
      await fetchBookingData();
      await fetchBookings();
      await fetchCars();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Data processing functions
  const createFallbackDataFromSurveys = () => {
    if (surveys && surveys.length > 0) {
      // Create mock status data for reference
      const _mockStatusData: ApprovalStatusData[] = [
        { status: 'อนุมัติ', count: surveys.length, color: '#10B981' }
      ];

      const requesterMap = new Map<string, number>();

      surveys.forEach(survey => {
        if (survey.requesterName) {
          const currentCount = requesterMap.get(survey.requesterName) || 0;
          requesterMap.set(survey.requesterName, currentCount + 1);
        }
      });

      const totalRequests = surveys.length;

      const requestersData: TopRequesterData[] = Array.from(requesterMap)
        .map(([name, count]) => ({
          name,
          count,
          percentage: (count / totalRequests) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTopRequestersData(requestersData);
    }
  };

  // Note: Approval status data is processed but not currently used in the UI
  // Keeping the processing logic here for future use or reference
  const processApprovalStatusData = (bookings: any[]) => {
    // Data processing complete
  };

  const processTopRequestersData = (bookings: any[]) => {
    const requesterMap = new Map<string, number>();

    bookings.forEach(booking => {
      if (booking.requesterName) {
        const currentCount = requesterMap.get(booking.requesterName) || 0;
        requesterMap.set(booking.requesterName, currentCount + 1);
      }
    });

    const totalBookings = bookings.length;

    const requestersData: TopRequesterData[] = Array.from(requesterMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalBookings) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setTopRequestersData(requestersData);
  };

  const processInitialData = (data: SurveyData[]) => {
    const driversMap = new Map<string, { total: number, count: number, photoUrl?: string }>();

    data.forEach(item => {
      if (item.driverName) {
        const currentData = driversMap.get(item.driverName) || { total: 0, count: 0, photoUrl: undefined };

        const score = (
          item.drivingRules + item.appropriateSpeed + item.politeDriving +
          item.servicePoliteness + item.missionUnderstanding + item.punctuality +
          item.travelPlanning + item.carSelection + item.carReadiness +
          item.carCleanliness
        ) / 10;

        driversMap.set(item.driverName, {
          total: currentData.total + score,
          count: currentData.count + 1,
          photoUrl: currentData.photoUrl || item.driverPhotoUrl
        });
      }
    });

    const driverStats: DriverPerformance[] = Array.from(driversMap).map(([name, stats]) => ({
      name,
      avgScore: parseFloat((stats.total / stats.count).toFixed(2)),
      count: stats.count,
      photoUrl: stats.photoUrl
    })).sort((a, b) => b.avgScore - a.avgScore);

    setAllDriverPerformance(driverStats);
    processFilteredData(data, selectedDriver, selectedPeriod);
  };

  const processFilteredData = (
    data: SurveyData[],
    driverFilter: string | null,
    periodFilter: string
  ) => {
    let filteredData = [...data];

    if (driverFilter !== null && driverFilter !== 'all') {
      const driverExists = allDriverPerformance.some(d => d.name === driverFilter);

      if (driverExists) {
        filteredData = filteredData.filter(item => item.driverName === driverFilter);
      } else {
        const searchPattern = new RegExp(driverFilter, 'i');
        filteredData = filteredData.filter(item =>
          item.driverName && searchPattern.test(item.driverName)
        );
      }
    }

    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (periodFilter) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
        case 'quarter':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate = new Date(0);
      }

      filteredData = filteredData.filter(item => new Date(item.createdAt) >= startDate);
    }

    const categoryScores = [
      { id: 'drivingRules', name: 'ขับขี่ตามกฎจราจร' },
      { id: 'appropriateSpeed', name: 'ใช้ความเร็วเหมาะสม' },
      { id: 'politeDriving', name: 'ขับขี่อย่างสุภาพ' },
      { id: 'servicePoliteness', name: 'ความสุภาพในการให้บริการ' },
      { id: 'missionUnderstanding', name: 'เข้าใจในภารกิจ' },
      { id: 'punctuality', name: 'ตรงต่อเวลา' },
      { id: 'travelPlanning', name: 'วางแผนการเดินทาง' },
      { id: 'carSelection', name: 'เลือกใช้รถเหมาะสม' },
      { id: 'carReadiness', name: 'ความพร้อมของรถ' },
      { id: 'carCleanliness', name: 'ความสะอาดของรถ' }
    ];

    const avgScores = categoryScores.map(cat => {
      const scores = filteredData.map(item => item[cat.id as keyof SurveyData] as number);
      const avg = scores.reduce((sum, val) => sum + val, 0) / (scores.length || 1);

      return {
        category: cat.id,
        fullName: cat.name,
        score: parseFloat(avg.toFixed(2))
      };
    });

    setAverageScores(avgScores);

    if (filteredData.length > 0) {
      const filteredDriversMap = new Map<string, { total: number, count: number }>();

      filteredData.forEach(item => {
        if (item.driverName) {
          const currentData = filteredDriversMap.get(item.driverName) || { total: 0, count: 0 };

          const score = (
            item.drivingRules + item.appropriateSpeed + item.politeDriving +
            item.servicePoliteness + item.missionUnderstanding + item.punctuality +
            item.travelPlanning + item.carSelection + item.carReadiness +
            item.carCleanliness
          ) / 10;

          filteredDriversMap.set(item.driverName, {
            total: currentData.total + score,
            count: currentData.count + 1
          });
        }
      });

      const filteredDriverStats: DriverPerformance[] = Array.from(filteredDriversMap).map(([name, stats]) => ({
        name,
        avgScore: parseFloat((stats.total / stats.count).toFixed(2)),
        count: stats.count
      })).sort((a, b) => b.avgScore - a.avgScore);

      setFilteredDriverPerformance(filteredDriverStats);
    } else {
      setFilteredDriverPerformance([]);
    }

    const timeMap = new Map<string, { total: number, count: number }>();

    filteredData.forEach(item => {
      const date = new Date(item.createdAt);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

      const currentData = timeMap.get(monthYear) || { total: 0, count: 0 };

      const score = (
        item.drivingRules + item.appropriateSpeed + item.politeDriving +
        item.servicePoliteness + item.missionUnderstanding + item.punctuality +
        item.travelPlanning + item.carSelection + item.carReadiness +
        item.carCleanliness
      ) / 10;

      timeMap.set(monthYear, {
        total: currentData.total + score,
        count: currentData.count + 1
      });
    });

    const timeStats: TimelineData[] = Array.from(timeMap).map(([date, stats]) => ({
      date,
      avgScore: parseFloat((stats.total / stats.count).toFixed(2)),
      count: stats.count
    })).sort((a, b) => {
      const [aMonth, aYear] = a.date.split('/').map(Number);
      const [bMonth, bYear] = b.date.split('/').map(Number);

      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });

    setTimelineData(timeStats);
  };

  // Effects
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await fetchSurveys();
        await fetchBookingData();
        await fetchBookings();
        await fetchCars();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  useEffect(() => {
    if (surveys.length > 0) {
      processFilteredData(surveys, selectedDriver, selectedPeriod);
    }
  }, [selectedDriver, selectedPeriod]);

  useEffect(() => {
    if (topRequestersData) {
      setFilteredTopRequestersData(topRequestersData);
    }
  }, [topRequestersData]);

  // Handlers
  const handleSetPeriod = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleSetDriver = (driver: string | null) => {
    setDriverSearchTerm('');
    setSelectedDriver(driver === 'all' ? null : driver);
  };

  const handleDriverSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value;
    setDriverSearchTerm(searchTerm);

    if (!searchTerm.trim()) {
      setSelectedDriver(null);
      return;
    }

    const matchedDriver = allDriverPerformance.find(
      driver => driver.name.toLowerCase() === searchTerm.toLowerCase()
    );

    if (matchedDriver) {
      setSelectedDriver(matchedDriver.name);
    } else {
      setSelectedDriver(searchTerm);
    }
  };

  const handleResetFilter = () => {
    setSelectedDriver(null);
    setSelectedPeriod('all');
    setDriverSearchTerm('');
  };

  const filterTopRequestersByPeriod = (period: string) => {
    setRequestersTimePeriod(period);

    if (!surveys || surveys.length === 0) {
      setFilteredTopRequestersData(topRequestersData);
      return;
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        setFilteredTopRequestersData(topRequestersData);
        return;
    }

    const filteredSurveys = surveys.filter(survey => new Date(survey.createdAt) >= startDate);

    const requesterMap = new Map<string, number>();

    filteredSurveys.forEach(survey => {
      if (survey.requesterName) {
        const currentCount = requesterMap.get(survey.requesterName) || 0;
        requesterMap.set(survey.requesterName, currentCount + 1);
      }
    });

    const totalRequests = filteredSurveys.length;

    if (totalRequests === 0) {
      setFilteredTopRequestersData([]);
      return;
    }

    const filteredData: TopRequesterData[] = Array.from(requesterMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalRequests) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setFilteredTopRequestersData(filteredData);
  };

  const handleSelectCar = (licensePlate: string) => {
    setSelectedCar(licensePlate);

    const car = cars.find(c => c.licensePlate === licensePlate);
    if (car) {
      setSelectedCarId(car.id);
    } else {
      setSelectedCarId(null);
    }
  };

  // Computed values
  const overallAverage = averageScores.length > 0
    ? (averageScores.reduce((sum, item) => sum + item.score, 0) / averageScores.length).toFixed(2)
    : "0.00";

  const getMinMaxScores = () => {
    if (averageScores.length === 0) return { min: { score: 0, name: "" }, max: { score: 0, name: "" } };

    let min = { score: 5, name: "" };
    let max = { score: 0, name: "" };

    averageScores.forEach(item => {
      if (item.score < min.score) {
        min = { score: item.score, name: item.fullName };
      }
      if (item.score > max.score) {
        max = { score: item.score, name: item.fullName };
      }
    });

    return { min, max };
  };

  const { min, max } = getMinMaxScores();

  // Render
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex justify-center items-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto animate-spin text-violet-600 dark:text-violet-400">
            <SparklesIcon className="w-full h-full" />
          </div>
          <p className="mt-6 text-xl font-semibold text-slate-800 dark:text-slate-200">
            กำลังวิเคราะห์ข้อมูล...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex justify-center items-center p-4">
        <Card className="max-w-md mx-auto border-red-200 dark:border-red-900/50">
          <CardBody className="text-center">
            <div className="inline-block p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">ไม่สามารถโหลดข้อมูล</h2>
            <p className="text-slate-600 dark:text-slate-300">{error}</p>

            <Button
              variant="primary"
              className="mt-6"
              onClick={fetchSurveys}
            >
              ลองใหม่อีกครั้ง
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (surveys.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex justify-center items-center p-4">
        <Card className="max-w-md mx-auto">
          <CardBody className="text-center">
            <div className="inline-block p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
              <LightBulbIcon className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">ยังไม่มีข้อมูลแบบประเมิน</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">เริ่มสร้างการประเมินแรกของคุณเพื่อดูข้อมูลเชิงลึก</p>

            <Button
              variant="primary"
              onClick={() => router.push('/booking')}
            >
              ไปยังหน้าจองรถ
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <AnalyticsHeader
        surveysLength={surveys.length}
        scrollPosition={scrollPosition}
        isFilterOpen={isFilterOpen}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        onRefresh={handleRefresh}
        allDriverPerformance={allDriverPerformance}
        selectedDriver={selectedDriver}
        selectedPeriod={selectedPeriod}
        driverSearchTerm={driverSearchTerm}
        onDriverChange={handleSetDriver}
        onPeriodChange={handleSetPeriod}
        onDriverSearch={handleDriverSearch}
        onResetFilter={handleResetFilter}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* KPI Cards - always visible under header */}
      <div className="pt-6 pb-2">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <KpiCards
          surveysLength={surveys.length}
          overallAverage={overallAverage}
          maxScore={max}
          minScore={min}
          selectedPeriod={selectedPeriod}
        />
        </div>
      </div>

      {/* Main content */}
      <main className="py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            surveys={surveys}
            averageScores={averageScores}
            overallAverage={overallAverage}
            minScore={min}
            maxScore={max}
            selectedPeriod={selectedPeriod}
            filteredTopRequestersData={filteredTopRequestersData}
            requestersTimePeriod={requestersTimePeriod}
            onRequestersTimePeriodChange={filterTopRequestersByPeriod}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTab averageScores={averageScores} />
        )}

        {activeTab === 'drivers' && (
          <DriversTab filteredDriverPerformance={filteredDriverPerformance} />
        )}

        {activeTab === 'trends' && (
          <TrendsTab timelineData={timelineData} />
        )}

        {activeTab === 'carstats' && (
          <CarStatsTab
            cars={cars}
            bookings={bookings}
            selectedCar={selectedCar}
            loadingCars={loadingCars}
            loadingBookings={loadingBookings}
            onSelectCar={handleSelectCar}
            onBack={() => {
              setSelectedCar(null);
              setSelectedCarId(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
