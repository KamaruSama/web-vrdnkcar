export interface SurveyData {
  id: number;
  bookingId: number;
  bookingNumber: string;
  requesterName: string;
  driverName: string;
  driverPhotoUrl?: string;
  carLicensePlate: string;
  createdAt: string;
  drivingRules: number;
  appropriateSpeed: number;
  politeDriving: number;
  servicePoliteness: number;
  missionUnderstanding: number;
  punctuality: number;
  travelPlanning: number;
  carSelection: number;
  carReadiness: number;
  carCleanliness: number;
  suggestions?: string;
}

export interface AverageScores {
  category: string;
  score: number;
  fullName: string;
}

export interface DriverPerformance {
  name: string;
  avgScore: number;
  count: number;
  photoUrl?: string;
}

export interface TimelineData {
  date: string;
  avgScore: number;
  count: number;
}

export interface ApprovalStatusData {
  status: string;
  count: number;
  color: string;
}

export interface TopRequesterData {
  name: string;
  count: number;
  percentage: number;
}
