import React from 'react';
import CategoryBarChart from './CategoryBarChart';
import RadarCompareChart from './RadarCompareChart';
import TopRequesters from './TopRequesters';
import RecentSurveysTable from './RecentSurveysTable';
import { SurveyData, AverageScores, TopRequesterData } from './types';

interface OverviewTabProps {
  surveys: SurveyData[];
  averageScores: AverageScores[];
  overallAverage: string;
  minScore: { score: number; name: string };
  maxScore: { score: number; name: string };
  selectedPeriod: string;
  filteredTopRequestersData: TopRequesterData[];
  requestersTimePeriod: string;
  onRequestersTimePeriodChange: (period: string) => void;
}

export default function OverviewTab({
  surveys,
  averageScores,
  filteredTopRequestersData,
  requestersTimePeriod,
  onRequestersTimePeriodChange
}: OverviewTabProps) {
  return (
    <div>
      {/* Overview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CategoryBarChart data={averageScores} />
        <RadarCompareChart data={averageScores} />
      </div>

      {/* Top Requesters */}
      <TopRequesters
        data={filteredTopRequestersData}
        timePeriod={requestersTimePeriod}
        onPeriodChange={onRequestersTimePeriodChange}
      />

      {/* Recent Surveys Table */}
      <RecentSurveysTable surveys={surveys} />
    </div>
  );
}
