'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Booking, User } from '@/types';
import BookingCard from './BookingCard';
import { 
  PlusIcon, ArrowPathIcon, FunnelIcon, MagnifyingGlassIcon, 
  EyeIcon, BookOpenIcon, TrashIcon,
  ChevronLeftIcon, ChevronRightIcon,
  ListBulletIcon, ViewColumnsIcon,
  PrinterIcon, UserIcon, CalendarIcon, TruckIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon, CogIcon,
  ChatBubbleLeftRightIcon, DocumentTextIcon
} from '@heroicons/react/24/outline';
import Modal from '../ui/Modal';
import BookingForm from './BookingForm';
import ImageSelect from '../ui/ImageSelect';

// Custom hook for interval functions
const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef<() => void>(callback);

  // Remember latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up interval
  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

interface BookingListProps {
  initialBookings: Booking[];
  currentUser: User | null;
  onRefresh: () => void;
  readOnly?: boolean;
  users?: User[];
}

const BookingList: React.FC<BookingListProps> = ({
  initialBookings,
  currentUser,
  onRefresh,
  readOnly = false,
  users = []
}) => {
  // เก็บค่า currentPage ใน ref เพื่อให้มีค่าคงที่ใน effect ต่างๆ
  const pageRef = useRef<number>(1);
  const isInitialMount = useRef(true);

  // อ่านค่า currentPage จาก localStorage ก่อนที่จะสร้าง state
  // และพยายามใช้ localStorage อย่างปลอดภัยด้วยการตรวจสอบ window
  const getSavedPage = () => {
    try {
      if (typeof window !== 'undefined') {
        const savedPage = localStorage.getItem('bookingListPage');
        return savedPage ? parseInt(savedPage, 10) : 1;
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
    return 1;
  };

  // Booking data states
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>(initialBookings);
  
  // UI states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [customDateMode, setCustomDateMode] = useState<'single' | 'range'>('single');
  const [evaluationFilter, setEvaluationFilter] = useState('all');
  const [requesterFilter, setRequesterFilter] = useState('all');
  const [carFilter, setCarFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // View mode states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(getSavedPage);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [paginatedBookings, setPaginatedBookings] = useState<Booking[]>([]);
  
  // Evaluation states — ดึงจาก booking data โดยตรง (ไม่ต้อง call API แยก)
  const evaluatedBookings = bookings.filter(b => b.hasEvaluated).map(b => b.id);
  const evaluatedTimestampsFromBookings: Record<number, number> = {};
  bookings.forEach(b => { if (b.evaluatedTimestamp) evaluatedTimestampsFromBookings[b.id] = b.evaluatedTimestamp; });
  
  // Admin states
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  
  // Config states
  const [successTimeout, setSuccessTimeout] = useState<number>(60); // Minutes
  const evaluatedTimestamps = evaluatedTimestampsFromBookings;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configSuccessTimeout, setConfigSuccessTimeout] = useState<number>(60);
  const [isConfigSubmitting, setIsConfigSubmitting] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  // เพิ่ม state สำหรับเก็บค่าเลขหน้าที่ผู้ใช้พิมพ์
  const [pageInputValue, setPageInputValue] = useState<string>("");

  // Load config values on component mount
  useEffect(() => {
    // Fetch config from API
    const fetchConfig = async () => {
      try {
        const response = await axios.get('/api/config');
        if (response.data && response.data.config) {
          // Update success timeout
          setSuccessTimeout(response.data.config.successCardTimeout);
          // Check if admin
          setIsAdmin(response.data.isAdmin || false);
          // Set initial config value for config modal
          setConfigSuccessTimeout(response.data.config.successCardTimeout);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
        // Use default on error (60 minutes)
      }
    };

    fetchConfig();
  }, []);
  
  // Update filters when initialBookings changes
  useEffect(() => {
    setBookings(initialBookings);
    applyFilters(initialBookings, statusFilter, searchQuery, dateFilter, showAllBookings, { keepCurrentPage: true }, evaluationFilter);
  }, [initialBookings]);

  // Apply filters when any filter changes
  useEffect(() => {
    applyFilters(bookings, statusFilter, searchQuery, dateFilter, showAllBookings, undefined, evaluationFilter);
  }, [statusFilter, searchQuery, dateFilter, evaluationFilter, requesterFilter, carFilter, driverFilter, bookings, showAllBookings, customDateFrom, customDateTo, customDateMode]);
  
  // Update pagination when filtered bookings or page changes
  useEffect(() => {
    paginateBookings();
  }, [filteredBookings, currentPage, itemsPerPage]);
  
  // useEffect สำหรับบันทึกค่า currentPage เมื่อมีการเปลี่ยนหน้า
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !isInitialMount.current) {
        localStorage.setItem('bookingListPage', currentPage.toString());
        pageRef.current = currentPage;
      }

      // หลังจาก initial mount ให้ตั้งค่า flag เป็น false
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [currentPage]);

  // เก็บหน้าปัจจุบันใน ref เพื่อใช้ใน interval
  useEffect(() => {
    pageRef.current = currentPage;
  }, [currentPage]);

  // Check for expired cards every 30 seconds
  useInterval(() => {
    // Re-apply filters to hide expired cards but keep current page
    const keepPage = pageRef.current; // เก็บหน้าปัจจุบันไว้

    // ใช้ flag เพื่อป้องกันการเปลี่ยนหน้าจาก applyFilters
    const tempFlag = { keepCurrentPage: true };
    applyFilters(bookings, statusFilter, searchQuery, dateFilter, showAllBookings, tempFlag, evaluationFilter);
  }, 60000); // Check every 60 seconds
  
  // Handle success timeout configuration change (admin only)
  const handleTimeoutChange = async () => {
    if (!isAdmin) return;
    
    try {
      setIsConfigSubmitting(true);
      setConfigMessage(null);
      
      // Save config to database
      const response = await axios.post('/api/config', {
        successCardTimeout: configSuccessTimeout
      });
      
      if (response.data && response.data.success) {
        // Update the success timeout value
        setSuccessTimeout(response.data.config.successCardTimeout);
        setConfigMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว');
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setIsConfigModalOpen(false);
          setConfigMessage(null);
        }, 2000);
      } else {
        setConfigMessage('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
      }
    } catch (error: any) {
      console.error('Error updating config:', error);
      setConfigMessage(error.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    } finally {
      setIsConfigSubmitting(false);
    }
  };
  
  // Pagination functions
  const paginateBookings = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    // Slice data for current page
    const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
    setPaginatedBookings(currentItems);
    
    // Calculate total pages
    setTotalPages(Math.ceil(filteredBookings.length / itemsPerPage));
  };
  
  // เปลี่ยน paginate function ให้ชัดเจนมากขึ้น
  const paginate = (pageNumber: number) => {
    // Ensure page number is valid
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);

      // บันทึกลง localStorage ทันที
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('bookingListPage', pageNumber.toString());
        }
      } catch (error) {
        console.error('Error saving page to localStorage:', error);
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // evaluated data ดึงจาก booking object โดยตรง ไม่ต้อง fetch แยก
  
  // Check if booking is evaluated
  const isBookingEvaluated = (bookingId: number) => {
    return evaluatedBookings.includes(bookingId);
  };
  
  // Check if self-driving (requester and driver are the same)
  const isSelfDriving = (booking: Booking) => {
    return booking.requesterName && booking.driverName &&
           booking.requesterName.trim() === booking.driverName.trim();
  };

  // Check if approved but no car/driver assigned (ไม่ต้องประเมิน)
  const isNoEvalBooking = (booking: Booking) => {
    return booking.approvalStatus === 'approved' && !isSelfDriving(booking) && (!booking.carId || !booking.driverId);
  };
  
  // Check if booking can be evaluated
  const canBookingBeEvaluated = (booking: Booking) => {
    return booking.approvalStatus === 'approved' && 
           booking.carId !== undefined && 
           booking.driverId !== undefined;
  };

  // Check if success card should be hidden based on timeout
  const shouldHideSuccessCard = (bookingId: number, isSelfDriving: boolean = false, isNoEval: boolean = false) => {
    // Don't hide if not success/no-eval card or in admin view
    if ((!isBookingEvaluated(bookingId) && !isSelfDriving && !isNoEval) || showAllBookings) {
      return false;
    }
    
    // Don't hide if timeout is disabled (0)
    if (successTimeout <= 0) {
      return false;
    }
    
    // Get evaluation timestamp or current time
    const evaluatedTime = evaluatedTimestamps[bookingId] || Date.now();
    const currentTime = Date.now();
    const elapsedMinutes = (currentTime - evaluatedTime) / (1000 * 60);
    
    // Hide if elapsed time exceeds timeout
    return elapsedMinutes > successTimeout;
  };
  
  // Apply filters to bookings
  const applyFilters = (
    data: Booking[],
    status: string,
    query: string,
    date: string,
    showAll: boolean = false,
    options?: { keepCurrentPage: boolean },
    evaluation: string = 'all'
  ) => {
    if (!data || data.length === 0) {
      setFilteredBookings([]);
      return;
    }
    
    let result = [...data];
    
    // Show all bookings in admin view if requested
    if (!showAll) {
      // Filter to only show cards that meet specific conditions
      result = result.filter(booking => {
        // Check if self-driving
        const selfDriving = isSelfDriving(booking);
        const noEval = isNoEvalBooking(booking);

        // Check if card should be hidden
        const shouldHide = (isBookingEvaluated(booking.id) ||
                          (selfDriving && booking.approvalStatus === 'approved') ||
                          noEval) &&
                          shouldHideSuccessCard(booking.id, Boolean(selfDriving), noEval);

        return (
          // Show pending approvals
          booking.approvalStatus === 'pending' ||
          // Show rejected bookings
          booking.approvalStatus === 'rejected' ||
          // Show bookings that need evaluation
          (canBookingBeEvaluated(booking) &&
           !isBookingEvaluated(booking.id) &&
           !selfDriving) ||
          // Show success/self-driving/no-eval cards that haven't timed out yet
          ((isBookingEvaluated(booking.id) ||
            (selfDriving && booking.approvalStatus === 'approved') ||
            noEval) &&
           !shouldHide)
        );
      });
    }
    
    // Filter by approval status
    if (status !== 'all') {
      result = result.filter(booking => booking.approvalStatus === status);
    }
    
    // Filter by date
    if (date !== 'all') {
      const now = new Date();
      let compareDate = new Date();
      
      switch (date) {
        case 'today':
          compareDate.setHours(0, 0, 0, 0);
          result = result.filter(booking => {
            const bookingDate = new Date(convertThaiDateToISO(booking.departureDate));
            return bookingDate >= compareDate && bookingDate <= now;
          });
          break;
          
        case 'week':
          compareDate.setDate(compareDate.getDate() - 7);
          result = result.filter(booking => {
            const bookingDate = new Date(convertThaiDateToISO(booking.departureDate));
            return bookingDate >= compareDate;
          });
          break;
          
        case 'month':
          compareDate.setDate(compareDate.getDate() - 30);
          result = result.filter(booking => {
            const bookingDate = new Date(convertThaiDateToISO(booking.departureDate));
            return bookingDate >= compareDate;
          });
          break;

        case 'year':
          compareDate.setFullYear(compareDate.getFullYear() - 1);
          result = result.filter(booking => {
            const bookingDate = new Date(convertThaiDateToISO(booking.departureDate));
            return bookingDate >= compareDate;
          });
          break;

        case 'custom':
          if (customDateMode === 'single' && customDateFrom) {
            result = result.filter(booking => {
              const bookingDate = new Date(convertThaiDateToISO(booking.departureDate));
              const from = new Date(customDateFrom);
              return bookingDate >= from && bookingDate <= new Date(customDateFrom + 'T23:59:59');
            });
          } else if (customDateMode === 'range' && (customDateFrom || customDateTo)) {
            result = result.filter(booking => {
              const bookingDate = new Date(convertThaiDateToISO(booking.departureDate));
              if (customDateFrom && bookingDate < new Date(customDateFrom)) return false;
              if (customDateTo) {
                const to = new Date(customDateTo);
                to.setHours(23, 59, 59, 999);
                if (bookingDate > to) return false;
              }
              return true;
            });
          }
          break;
      }
    }
    
    // Filter by search query
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      result = result.filter(booking => 
        (booking.bookingNumber?.toLowerCase().includes(lowercaseQuery)) ||
        (booking.requesterName?.toLowerCase().includes(lowercaseQuery)) ||
        (booking.destination?.toLowerCase().includes(lowercaseQuery)) ||
        (booking.purpose?.toLowerCase().includes(lowercaseQuery)) ||
        (booking.carLicensePlate?.toLowerCase().includes(lowercaseQuery)) ||
        (booking.driverName?.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    // Filter by requester
    if (requesterFilter !== 'all') {
      result = result.filter(booking => booking.requesterName === requesterFilter);
    }

    // Filter by car
    if (carFilter !== 'all') {
      result = result.filter(booking => booking.carLicensePlate === carFilter);
    }

    // Filter by driver
    if (driverFilter !== 'all') {
      result = result.filter(booking => booking.driverName === driverFilter);
    }

    // Filter by evaluation status
    if (evaluation !== 'all') {
      result = result.filter(booking => {
        const evaluated = isBookingEvaluated(booking.id);
        const selfDriving = isSelfDriving(booking);
        const canEvaluate = booking.approvalStatus === 'approved' && booking.carId && booking.driverId && !selfDriving;
        if (evaluation === 'evaluated') return evaluated;
        if (evaluation === 'cannot_evaluate') return booking.approvalStatus === 'approved' && !canEvaluate;
        // not_evaluated: approved + can be evaluated but hasn't been
        return !evaluated;
      });
    }

    // Sort by submission date (newest first)
    result.sort((a, b) => {
      const dateA = new Date(convertThaiDateToISO(a.submissionDate));
      const dateB = new Date(convertThaiDateToISO(b.submissionDate));
      return dateB.getTime() - dateA.getTime();
    });
    
    setFilteredBookings(result);
    
    // สำคัญมาก: ต้องรอให้ totalPages คำนวณก่อน จึงจะตัดสินใจว่าจะเปลี่ยนหน้าหรือไม่
    // ใช้ setTimeout กับ promise เพื่อให้ state เปลี่ยนค่าและคำนวณ totalPages ก่อน
    const savedPage = currentPage;
    
    // ถ้าเรียกจาก interval ด้วย options.keepCurrentPage = true ไม่ต้องเปลี่ยนหน้า
    if (options?.keepCurrentPage) {
      return;
    }

    Promise.resolve().then(() => {
      setTimeout(() => {
        const calculatedTotalPages = Math.ceil(result.length / itemsPerPage);

        // หากหน้าปัจจุบันมากกว่าจำนวนหน้าทั้งหมด ให้ไปที่หน้าสุดท้าย
        if (savedPage > calculatedTotalPages && calculatedTotalPages > 0) {
          setCurrentPage(calculatedTotalPages);
        }
      }, 50); // ให้เวลาระบบคำนวณ state ใหม่
    });
  };

  // Convert Thai date format (dd/mm/yyyy) to ISO format (yyyy-mm-dd)
  const convertThaiDateToISO = (thaiDate: string) => {
    if (!thaiDate) return '';
    
    const parts = thaiDate.split('/');
    if (parts.length !== 3) return thaiDate;
    
    // Convert Buddhist year to Gregorian
    const year = parseInt(parts[2]) - 543;
    return `${year}-${parts[1]}-${parts[0]}`;
  };

  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    setStatusFilter(status);
  };

  // Handle date filter change
  const handleDateFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const date = e.target.value;
    setDateFilter(date);
  };

  // Handle search query change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  };

  // Generic function to update booking data
  const handleUpdateBooking = async (bookingId: number, updateData: any) => {
    if (readOnly) return;
    
    try {
      setErrorMessage(null);
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;
      
      // Create axios instance with timeout
      const axiosInstance = axios.create({
        timeout: 10000, // 10 seconds
      });
      
      // Add required data
      updateData.bookingNumber = booking.bookingNumber;
      updateData.userId = currentUser?.id || 1; // Default to 1 if no user
      
      await axiosInstance.put(`/api/bookings/${bookingId}`, updateData);

      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Error updating booking:', error);
      
      // Handle errors
      if (error.response?.status === 500) {
        setErrorMessage('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ โปรดลองใหม่อีกครั้ง');
      } else if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else if (error.code === 'ECONNABORTED') {
        setErrorMessage('การเชื่อมต่อใช้เวลานานเกินไป โปรดลองใหม่อีกครั้ง');
      } else {
        setErrorMessage('เกิดข้อผิดพลาดในการปรับปรุงข้อมูล กรุณาลองใหม่อีกครั้ง');
      }
      
      throw error; // Rethrow for BookingCard to handle
    }
  };

  // Update car
  const handleUpdateCar = async (bookingId: number, carId: string) => {
    return handleUpdateBooking(bookingId, {
      carId: carId ? parseInt(carId) : null
    });
  };

  // Update driver
  const handleUpdateDriver = async (bookingId: number, driverId: string) => {
    return handleUpdateBooking(bookingId, {
      driverId: driverId ? parseInt(driverId) : null
    });
  };

  // Update notes
  const handleUpdateNotes = async (bookingId: number, notes: string) => {
    return handleUpdateBooking(bookingId, { notes });
  };

  // Update approval status
  const handleUpdateApproval = async (bookingId: number, status: 'approved' | 'rejected' | 'pending', notes?: string) => {
    return handleUpdateBooking(bookingId, {
      approvalStatus: status,
      approvalNotes: notes
    });
  };

  // Create new booking
  const handleCreateBooking = async (data: any) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // Validate requester
      if (!data.requesterId) {
        setErrorMessage('กรุณาเลือกผู้ขอ');
        setIsSubmitting(false);
        return;
      }
      
      // Create axios instance with timeout
      const axiosInstance = axios.create({
        timeout: 10000, // 10 seconds
      });
      
      await axiosInstance.post('/api/bookings', {
        ...data,
        requesterId: data.requesterId
      });

      setIsBookingModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      
      // Handle errors
      if (error.response?.status === 500) {
        setErrorMessage('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ โปรดลองใหม่อีกครั้งในภายหลัง');
      } else if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else if (error.code === 'ECONNABORTED') {
        setErrorMessage('การเชื่อมต่อใช้เวลานานเกินไป โปรดลองใหม่อีกครั้ง');
      } else {
        setErrorMessage('เกิดข้อผิดพลาดในการสร้างคำขอ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update survey status — อัปเดตใน bookings state โดยตรง
  const handleUpdateSurveyStatus = (bookingId: number, hasBeenEvaluated: boolean) => {
    setBookings(prev => prev.map(b =>
      b.id === bookingId
        ? { ...b, hasEvaluated: hasBeenEvaluated, evaluatedTimestamp: hasBeenEvaluated ? Date.now() : null }
        : b
    ));
    
    // Refresh displayed bookings
    applyFilters(bookings, statusFilter, searchQuery, dateFilter, showAllBookings, undefined, evaluationFilter);
  };

  // Count pending evaluations
  const countPendingEvaluations = () => {
    return filteredBookings.filter(booking => 
      booking.approvalStatus === 'approved' && 
      booking.carId && 
      booking.driverId && 
      !isBookingEvaluated(booking.id) &&
      !isSelfDriving(booking)
    ).length;
  };

  // Count pending approvals
  const countPendingApprovals = () => {
    return filteredBookings.filter(booking => 
      booking.approvalStatus === 'pending'
    ).length;
  };

  // Delete booking (admin only)
  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;
    
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // Send delete request
      await axios.delete(`/api/bookings/${bookingToDelete.id}`);
      
      // Remove from local data
      setBookings(prev => prev.filter(b => b.id !== bookingToDelete.id));
      setFilteredBookings(prev => prev.filter(b => b.id !== bookingToDelete.id));
      
      // evaluatedBookings ดึงจาก bookings โดยตรง ไม่ต้อง remove แยก
      
      setIsDeleteModalOpen(false);
      setBookingToDelete(null);
      
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      setErrorMessage(
        error.response?.data?.error || 'เกิดข้อผิดพลาดในการลบการจอง กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status badge component
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
            <CheckCircleIcon className="mr-1 h-4 w-4" />
            อนุมัติแล้ว
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
            <XCircleIcon className="mr-1 h-4 w-4" />
            ไม่อนุมัติ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
            <ClockIcon className="mr-1 h-4 w-4" />
            รออนุมัติ
          </span>
        );
    }
  };

  // เพิ่มฟังก์ชันสำหรับตรวจสอบว่าจะแสดงปุ่มรีเฟรช
  const handleRefreshClick = () => {
    // เก็บหน้าปัจจุบันไว้ก่อนรีเฟรช
    const currentPageBeforeRefresh = currentPage;

    // ทำการรีเฟรชข้อมูล
    if (onRefresh) {
      onRefresh();
    }

    // หลังจากรีเฟรชแล้ว ให้รอข้อมูลโหลดเสร็จแล้วค่อยตรวจสอบว่าต้องเปลี่ยนหน้าหรือไม่
    setTimeout(() => {
      const newTotalPages = Math.ceil(filteredBookings.length / itemsPerPage);

      // ถ้าหน้าเดิมยังอยู่ในช่วงที่ถูกต้อง ให้ย้ายไปที่หน้านั้น
      if (currentPageBeforeRefresh <= newTotalPages && newTotalPages > 0) {
        setCurrentPage(currentPageBeforeRefresh);
      } else if (newTotalPages > 0) {
        // ถ้าหน้าเดิมเกินจำนวนหน้าใหม่ ให้ไปหน้าสุดท้าย
        setCurrentPage(newTotalPages);
      }
    }, 500); // รอให้ข้อมูลโหลดเสร็จ
  };

  // ฟังก์ชันสำหรับจัดการการพิมพ์เลขหน้า
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // รับเฉพาะตัวเลขเท่านั้น
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPageInputValue(value);
  };
  
  // ฟังก์ชันสำหรับไปยังหน้าที่พิมพ์
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pageInputValue) return;

    const pageNumber = parseInt(pageInputValue, 10);

    // ตรวจสอบว่าเลขหน้าอยู่ในช่วงที่ถูกต้อง
    if (pageNumber > 0 && pageNumber <= totalPages) {
      paginate(pageNumber);
      setPageInputValue(''); // เคลียร์ input หลังจากไปยังหน้าที่ต้องการแล้ว
    } else {
      // แจ้งเตือนถ้าเลขหน้าไม่ถูกต้อง
      alert(`กรุณาใส่เลขหน้าระหว่าง 1 - ${totalPages}`);
    }
  };

  return (
    <div>
      {/* Header with buttons and search */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          {/* Search box */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ height: '38px', minHeight: '38px', padding: '0 12px 0 36px', fontSize: '14px' }}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Admin show all button */}
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setShowAllBookings(!showAllBookings)}
                data-tooltip={showAllBookings ? 'ดูรายการที่ต้องจัดการ' : 'ดูทั้งหมด'}
                className={`action-button ${showAllBookings ? 'action-button-active' : ''}`}
                aria-label={showAllBookings ? 'ดูรายการที่ต้องจัดการ' : 'ดูทั้งหมด'}
              >
                <EyeIcon className="action-icon" />
                <span className="action-text">{showAllBookings ? 'ดูรายการที่ต้องจัดการ' : 'ดูทั้งหมด'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              data-tooltip="กรอง"
              className={`action-button ${isFilterOpen ? 'action-button-active' : ''}`}
              aria-label="กรอง"
            >
              <FunnelIcon className="action-icon" />
              <span className="action-text">กรอง</span>
            </button>
            
            {/* Config button (admin only) */}
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                data-tooltip="ตั้งค่าระบบ"
                className="action-button"
                aria-label="ตั้งค่าระบบ"
              >
                <CogIcon className="action-icon" />
                <span className="action-text">ตั้งค่าระบบ</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={handleRefreshClick}
              data-tooltip="รีเฟรช"
              className="action-button"
              aria-label="รีเฟรช"
            >
              <ArrowPathIcon className="action-icon" />
              <span className="action-text">รีเฟรช</span>
            </button>
            
            {/* View mode buttons */}
            <div className="hidden md:flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center px-2 py-2 text-sm font-medium rounded-l-md border border-gray-300 dark:border-gray-600 focus:z-10 focus:ring-1 focus:ring-primary-500 ${
                  viewMode === 'grid' 
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-500 dark:border-primary-500' 
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <ViewColumnsIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center px-2 py-2 text-sm font-medium rounded-r-md border border-gray-300 dark:border-gray-600 focus:z-10 focus:ring-1 focus:ring-primary-500 ${
                  viewMode === 'list'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-500 dark:border-primary-500'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
            </div>
            
            {/* Create new booking button */}
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(true)}
              data-tooltip="สร้างคำขอใหม่"
              className="action-button action-button-primary"
              aria-label="สร้างคำขอใหม่"
            >
              <PlusIcon className="action-icon" />
              <span className="action-text">สร้างคำขอใหม่</span>
            </button>
          </div>
        </div>
        
        {/* Mobile filter — bottom sheet */}
        {isFilterOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={e => { if (e.target === e.currentTarget) setIsFilterOpen(false); }}>
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[80vh] overflow-auto animate-in slide-in-from-bottom">
              <div className="sticky top-0 bg-white dark:bg-gray-800 px-5 pt-4 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">ตัวกรอง</h3>
                <div className="flex gap-2">
                  <button onClick={() => { setStatusFilter('all'); setDateFilter('all'); setEvaluationFilter('all'); setRequesterFilter('all'); setCarFilter('all'); setDriverFilter('all'); setSearchQuery(''); setCustomDateFrom(''); setCustomDateTo(''); setCustomDateMode('single'); }} className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1">รีเซ็ต</button>
                  <button onClick={() => setIsFilterOpen(false)} className="text-xs bg-primary-600 text-white rounded-full px-3 py-1 font-medium">เสร็จ</button>
                </div>
              </div>
              <div className="px-5 py-3 space-y-4">
                {/* สถานะ */}
                <div>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">สถานะ</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[{ value: 'all', label: 'ทั้งหมด' }, { value: 'pending', label: 'รออนุมัติ' }, { value: 'approved', label: 'อนุมัติแล้ว' }, { value: 'rejected', label: 'ไม่อนุมัติ' }].map(opt => (
                      <button key={opt.value} onClick={() => handleStatusFilterChange({ target: { value: opt.value } } as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === opt.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                {/* วันที่ */}
                <div>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">วันที่</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[{ value: 'all', label: 'ทั้งหมด' }, { value: 'today', label: 'วันนี้' }, { value: 'week', label: '7 วัน' }, { value: 'month', label: '30 วัน' }, { value: 'year', label: '1 ปี' }, { value: 'custom', label: 'ปรับแต่ง' }].map(opt => (
                      <button key={opt.value} onClick={() => handleDateFilterChange({ target: { value: opt.value } } as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dateFilter === opt.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                {/* การประเมิน */}
                <div>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">การประเมิน</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[{ value: 'all', label: 'ทั้งหมด' }, { value: 'evaluated', label: 'ประเมินแล้ว' }, { value: 'not_evaluated', label: 'ยังไม่ประเมิน' }, { value: 'cannot_evaluate', label: 'ไม่ต้องประเมิน' }].map(opt => (
                      <button key={opt.value} onClick={() => setEvaluationFilter(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${evaluationFilter === opt.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                {/* ผู้ขอ */}
                <div>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">ผู้ขอ</span>
                  <div className="mt-2">
                    <ImageSelect value={requesterFilter} onChange={setRequesterFilter} placeholder="ทั้งหมด" fallbackIcon={<UserIcon className="w-full h-full" />}
                      options={[{ value: 'all', label: 'ทั้งหมด' }, ...Array.from(new Map(initialBookings.filter(b => b.requesterName).map(b => [b.requesterName!, { name: b.requesterName!, photo: b.requesterPhotoUrl }])).values()).sort((a, b) => a.name.localeCompare(b.name)).map(r => ({ value: r.name, label: r.name, imageUrl: r.photo }))]} />
                  </div>
                </div>
                {/* รถ */}
                <div>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">รถ</span>
                  <div className="mt-2">
                    <ImageSelect value={carFilter} onChange={setCarFilter} placeholder="ทั้งหมด" fallbackIcon={<TruckIcon className="w-full h-full" />}
                      options={[{ value: 'all', label: 'ทั้งหมด' }, ...Array.from(new Map(initialBookings.filter(b => b.carLicensePlate).map(b => [b.carLicensePlate!, { plate: b.carLicensePlate!, photo: b.carPhotoUrl }])).values()).sort((a, b) => a.plate.localeCompare(b.plate)).map(c => ({ value: c.plate, label: c.plate, imageUrl: c.photo }))]} />
                  </div>
                </div>
                {/* คนขับ */}
                <div>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">คนขับ</span>
                  <div className="mt-2">
                    <ImageSelect value={driverFilter} onChange={setDriverFilter} placeholder="ทั้งหมด" fallbackIcon={<UserIcon className="w-full h-full" />}
                      options={[{ value: 'all', label: 'ทั้งหมด' }, ...Array.from(new Map(initialBookings.filter(b => b.driverName).map(b => [b.driverName!, { name: b.driverName!, photo: b.driverPhotoUrl }])).values()).sort((a, b) => a.name.localeCompare(b.name)).map(d => ({ value: d.name, label: d.name, imageUrl: d.photo }))]} />
                  </div>
                </div>
              </div>
              <div className="h-6" />
            </div>
          </div>
        )}

        {/* Desktop filter panel */}
        {isFilterOpen && (
          <div className="hidden md:block mt-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Row 1: สถานะ วันที่ การประเมิน */}
            <div className="grid grid-cols-[auto_1fr_auto]">
              {/* รีเซ็ต ซ้าย — ครอบทั้ง 2 rows */}
              <div className="row-span-2 flex items-stretch border-r border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => { setStatusFilter('all'); setDateFilter('all'); setEvaluationFilter('all'); setRequesterFilter('all'); setCarFilter('all'); setDriverFilter('all'); setSearchQuery(''); setCustomDateFrom(''); setCustomDateTo(''); setCustomDateMode('single'); }}
                  className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors px-3 [writing-mode:vertical-rl] [text-orientation:mixed] tracking-widest rotate-180"
                >
                  รีเซ็ต
                </button>
              </div>
              {/* Row 1 */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">

              {/* สถานะ */}
              <div className="px-4 py-3 flex flex-col gap-2 items-center">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">สถานะ</span>
                <div className="flex flex-wrap gap-1.5 w-full justify-center">
                  {[
                    { value: 'all', label: 'ทั้งหมด' },
                    { value: 'pending', label: 'รออนุมัติ' },
                    { value: 'approved', label: 'อนุมัติแล้ว' },
                    { value: 'rejected', label: 'ไม่อนุมัติ' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusFilterChange({ target: { value: opt.value } } as any)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        statusFilter === opt.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* วันที่ */}
              <div className="px-4 py-3 flex flex-col gap-2 items-center">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">วันที่</span>
                <div className="flex flex-wrap gap-1.5 w-full justify-center">
                  {[
                    { value: 'all', label: 'ทั้งหมด' },
                    { value: 'today', label: 'วันนี้' },
                    { value: 'week', label: '7 วัน' },
                    { value: 'month', label: '30 วัน' },
                    { value: 'year', label: '1 ปี' },
                    { value: 'custom', label: 'ปรับแต่ง' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleDateFilterChange({ target: { value: opt.value } } as any)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        dateFilter === opt.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* การประเมิน */}
              <div className="px-4 py-3 flex flex-col gap-2 items-center">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">การประเมิน</span>
                <div className="flex flex-wrap gap-1.5 w-full justify-center">
                  {[
                    { value: 'all', label: 'ทั้งหมด' },
                    { value: 'evaluated', label: 'ประเมินแล้ว' },
                    { value: 'not_evaluated', label: 'ยังไม่ประเมิน' },
                    { value: 'cannot_evaluate', label: 'ไม่ต้องประเมิน' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setEvaluationFilter(opt.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        evaluationFilter === opt.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              </div>
              {/* รีเซ็ต ขวา — ครอบทั้ง 2 rows */}
              <div className="row-span-2 flex items-stretch border-l border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => { setStatusFilter('all'); setDateFilter('all'); setEvaluationFilter('all'); setRequesterFilter('all'); setCarFilter('all'); setDriverFilter('all'); setSearchQuery(''); setCustomDateFrom(''); setCustomDateTo(''); setCustomDateMode('single'); }}
                  className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors px-3 [writing-mode:vertical-rl] [text-orientation:mixed] tracking-widest"
                >
                  รีเซ็ต
                </button>
              </div>

              {/* Row 2: ผู้ขอ รถ คนขับ */}
              <div className="border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-700">
              {/* ผู้ขอ */}
              <div className="px-4 py-2 flex items-center justify-center gap-2">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">ผู้ขอ</span>
                <ImageSelect
                  variant="pill"
                  value={requesterFilter}
                  onChange={setRequesterFilter}
                  placeholder="ทั้งหมด"
                  fallbackIcon={<UserIcon className="w-full h-full" />}
                  options={[
                    { value: 'all', label: 'ทั้งหมด' },
                    ...Array.from(
                      new Map(initialBookings.filter(b => b.requesterName).map(b => [b.requesterName!, { name: b.requesterName!, photo: b.requesterPhotoUrl }])).values()
                    ).sort((a, b) => a.name.localeCompare(b.name)).map(r => ({ value: r.name, label: r.name, imageUrl: r.photo })),
                  ]}
                />
              </div>

              {/* รถ */}
              <div className="px-4 py-2 flex items-center justify-center gap-2">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">รถ</span>
                <ImageSelect
                  variant="pill"
                  value={carFilter}
                  onChange={setCarFilter}
                  placeholder="ทั้งหมด"
                  fallbackIcon={<TruckIcon className="w-full h-full" />}
                  options={[
                    { value: 'all', label: 'ทั้งหมด' },
                    ...Array.from(
                      new Map(initialBookings.filter(b => b.carLicensePlate).map(b => [b.carLicensePlate!, { plate: b.carLicensePlate!, photo: b.carPhotoUrl }])).values()
                    ).sort((a, b) => a.plate.localeCompare(b.plate)).map(c => ({ value: c.plate, label: c.plate, imageUrl: c.photo })),
                  ]}
                />
              </div>

              {/* คนขับ */}
              <div className="px-4 py-2 flex items-center justify-center gap-2">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">คนขับ</span>
                <ImageSelect
                  variant="pill"
                  value={driverFilter}
                  onChange={setDriverFilter}
                  placeholder="ทั้งหมด"
                  fallbackIcon={<UserIcon className="w-full h-full" />}
                  options={[
                    { value: 'all', label: 'ทั้งหมด' },
                    ...Array.from(
                      new Map(initialBookings.filter(b => b.driverName).map(b => [b.driverName!, { name: b.driverName!, photo: b.driverPhotoUrl }])).values()
                    ).sort((a, b) => a.name.localeCompare(b.name)).map(d => ({ value: d.name, label: d.name, imageUrl: d.photo })),
                  ]}
                />
              </div>
            </div>
            </div>

          </div>
        )}

        {isFilterOpen && dateFilter === 'custom' && (
          <div className="mt-2 flex justify-center">
            <div className="inline-flex flex-col items-center gap-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 shadow-sm">
              {/* Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                <button
                  onClick={() => { setCustomDateMode('single'); setCustomDateTo(''); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${customDateMode === 'single' ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
                >
                  เลือกวัน
                </button>
                <button
                  onClick={() => setCustomDateMode('range')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${customDateMode === 'range' ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
                >
                  ตั้งแต่
                </button>
              </div>
              {/* Inputs */}
              {customDateMode === 'single' ? (
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={e => setCustomDateFrom(e.target.value)}
                  className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={e => setCustomDateFrom(e.target.value)}
                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-400">—</span>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={e => setCustomDateTo(e.target.value)}
                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-4">
          <p className="font-medium">เกิดข้อผิดพลาด</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Admin view note */}
      {currentUser?.role === 'admin' && showAllBookings && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <BookOpenIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                คุณกำลังดูรายการทั้งหมด รวมถึงรายการที่ประเมินแล้วและขับรถเอง
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Booking count */}
      {filteredBookings.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            พบ {filteredBookings.length} รายการ 
            {filteredBookings.length > itemsPerPage && (
              <span className="ml-1">(แสดง {paginatedBookings.length} รายการ, หน้า {currentPage}/{totalPages})</span>
            )}:
            <span className="ml-1 text-yellow-600 dark:text-yellow-400 font-medium">{countPendingApprovals()} รออนุมัติ</span> • 
            <span className="ml-1 text-blue-600 dark:text-blue-400 font-medium">{countPendingEvaluations()} รอประเมิน</span>
          </p>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-4 flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
          <p className="text-sm text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      )}
      
      {/* List view */}
      {!isLoading && viewMode === 'list' && paginatedBookings.length > 0 && (
        <div className="overflow-hidden bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    หมายเลข/วันที่
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ผู้ขอ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    สถานที่/วัตถุประสงค์
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    วันเวลา
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    รถ/คนขับ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">จัดการ</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{booking.bookingNumber}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{booking.submissionDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{booking.requesterName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white truncate max-w-xs">{booking.destination}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{booking.purpose}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {booking.departureDate} {booking.departureTime}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ถึง {booking.returnDate} {booking.returnTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{booking.carLicensePlate || '-'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{booking.driverName || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.approvalStatus || 'pending')}
                      {booking.approvalStatus === 'approved' && isBookingEvaluated(booking.id) && (
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          <CheckCircleIcon className="mr-1 h-3 w-3" />
                          ประเมินแล้ว
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <a
                          href={`/print/${booking.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="พิมพ์ใบขออนุญาต"
                        >
                          <PrinterIcon className="h-5 w-5" />
                        </a>
                        
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => {
                              setBookingToDelete(booking);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="ลบรายการ"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Grid view */}
      {!isLoading && viewMode === 'grid' && paginatedBookings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedBookings.map((booking) => (
            <div key={booking.id} className="relative flex flex-col">
              {/* Admin delete button */}
              {currentUser?.role === 'admin' && (
                <div className="absolute -right-2 -top-2 z-10">
                  <button
                    onClick={() => {
                      setBookingToDelete(booking);
                      setIsDeleteModalOpen(true);
                    }}
                    className="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 shadow-md" 
                    title="ลบการจองนี้"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <BookingCard
                booking={booking}
                currentUser={currentUser}
                onUpdateCar={handleUpdateCar}
                onUpdateDriver={handleUpdateDriver}
                onUpdateNotes={handleUpdateNotes}
                onUpdateApproval={handleUpdateApproval}
                onUpdateSurveyStatus={handleUpdateSurveyStatus}
                hasEvaluated={isBookingEvaluated(booking.id)}
                readOnly={readOnly}
                adminView={currentUser?.role === 'admin'}
                successTimeout={successTimeout}
                evaluatedTimestamp={evaluatedTimestamps[booking.id]}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* No results message */}
      {!isLoading && paginatedBookings.length === 0 && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">ไม่พบรายการที่ตรงกับเงื่อนไข</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' 
              ? 'ลองเปลี่ยนตัวกรองหรือคำค้นหา' 
              : 'ยังไม่มีรายการในระบบ'}
          </p>
          <div className="mt-4">
            <button
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('all');
                setSearchQuery('');
              }}
              className="mx-auto inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              รีเซ็ตตัวกรอง
            </button>
          </div>
        </div>
      )}
      
      {/* Pagination */}
      {!isLoading && filteredBookings.length > itemsPerPage && (
        <div className="mt-6 flex items-center justify-between">
          {/* Mobile pagination */}
          <div className="flex-1 flex flex-col space-y-3 sm:hidden">
            {/* แถวบนสำหรับข้อมูลหน้าและฟอร์มป้อนเลขหน้า */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                หน้า {currentPage} จาก {totalPages}
              </div>
              
              {/* ฟอร์มสำหรับพิมพ์เลขหน้าในมือถือ */}
              <form onSubmit={handlePageInputSubmit} className="flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  placeholder="หน้าที่?"
                  style={{ height: '38px', minHeight: '38px', fontSize: '14px' }}
                  className="w-16 px-2 border border-gray-300 dark:border-gray-600 rounded-l-md text-center focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                  aria-label="ไปที่หน้า"
                  maxLength={4}
                />
                <button
                  type="submit"
                  className="h-8 px-3 py-1 text-xs rounded-r-md bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-l-0 border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-800/50"
                >
                  ไป
                </button>
              </form>
            </div>
            
            {/* ปุ่มก่อนหน้า/ถัดไป */}
            <div className="flex justify-between">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative flex-1 mr-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                ก่อนหน้า
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative flex-1 ml-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                ถัดไป
                <ChevronRightIcon className="h-5 w-5 ml-1" />
              </button>
            </div>
          </div>
          
          {/* Desktop pagination */}
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-400">
                แสดง <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredBookings.length)}
                </span>{' '}
                จากทั้งหมด <span className="font-medium">{filteredBookings.length}</span> รายการ
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 dark:text-gray-500">แสดง</span>
                <div className="flex gap-1">
                  {[9, 30, 60, 90, 120, 150, 300].map(n => (
                    <button
                      key={n}
                      onClick={() => { setItemsPerPage(n); setCurrentPage(1); }}
                      className={`px-2 h-7 rounded text-xs font-medium transition-colors ${
                        itemsPerPage === n
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">ใบ</span>
              </div>
            </div>
            
            <div className="flex items-center">
              {/* ฟอร์มสำหรับพิมพ์เลขหน้าในหน้าจอขนาดใหญ่ */}
              <form onSubmit={handlePageInputSubmit} className="flex items-center mr-4">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">ไปที่หน้า:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  style={{ height: '38px', minHeight: '38px', fontSize: '14px' }}
                  className="w-14 px-2 border border-gray-300 dark:border-gray-600 rounded-md text-center focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                  aria-label="ไปที่หน้า"
                  maxLength={4}
                />
                <button
                  type="submit"
                  className="ml-2 px-3 py-1 text-xs rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-800/50"
                >
                  ไป
                </button>
              </form>
              
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 ${
                    currentPage === 1 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">ก่อนหน้า</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, i, array) => {
                    // Show ellipsis when there are gaps
                    const showEllipsis = i > 0 && array[i - 1] !== page - 1;
                    
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => paginate(page)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            page === currentPage
                              ? 'z-10 bg-primary-50 dark:bg-primary-900/30 border-primary-500 dark:border-primary-500 text-primary-600 dark:text-primary-400'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          } text-sm font-medium`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="sr-only">ถัดไป</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* New booking modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="สร้างคำขอใช้รถ"
        size="full"
      >
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            <p className="font-medium">เกิดข้อผิดพลาด</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}
        
        <BookingForm
          currentUser={currentUser}
          onSubmit={handleCreateBooking}
          onCancel={() => setIsBookingModalOpen(false)}
          isSubmitting={isSubmitting}
          forceShowRequesterDropdown={true}
          users={users}
        />
      </Modal>
      
      {/* Delete confirmation modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setBookingToDelete(null);
        }}
        title="ยืนยันการลบการจอง"
        size="md"
      >
        <div className="p-4">
          {errorMessage && isDeleteModalOpen && (
            <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm border border-red-200 mb-4">
              {errorMessage}
            </div>
          )}
          
          <p className="mb-4">คุณต้องการลบการจองหมายเลข <span className="font-semibold">{bookingToDelete?.bookingNumber}</span> ใช่หรือไม่?</p>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  การลบการจองจะลบการประเมินที่เกี่ยวข้องด้วย และไม่สามารถกู้คืนได้
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setBookingToDelete(null);
              }}
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteBooking}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  กำลังลบ...
                </>
              ) : 'ลบการจอง'}
            </button>
          </div>
        </div>
      </Modal>

      {/* System settings modal */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="ตั้งค่าระบบ"
        size="md"
      >
        <div className="p-4">
          {configMessage && (
            <div className={`mb-4 p-3 rounded-md ${
              configMessage.includes('เกิดข้อผิดพลาด')
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            }`}>
              <p>{configMessage}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="config-success-timeout" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                เวลาแสดงการ์ด Success (นาที)
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  id="config-success-timeout"
                  min="0"
                  value={configSuccessTimeout}
                  onChange={(e) => setConfigSuccessTimeout(parseInt(e.target.value) || 0)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={isConfigSubmitting}
                />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  {configSuccessTimeout > 0 
                    ? `(${configSuccessTimeout} นาที)` 
                    : '(แสดงตลอด)'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                ตั้งค่าเป็น 0 เพื่อแสดงตลอด
              </p>
            </div>
            
            <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
              <h4 className="text-xs font-medium text-blue-700 dark:text-blue-400">ตัวอย่าง:</h4>
              <ul className="list-disc pl-5 mt-1 text-xs text-blue-600 dark:text-blue-400">
                <li>60 นาที - แสดงการ์ดที่ประเมินแล้วนาน 1 ชั่วโมง</li>
                <li>1440 นาที - แสดง 1 วัน</li>
                <li>0 นาที - แสดงตลอด</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    การตั้งค่านี้จะมีผลกับทุกผู้ใช้ในระบบ และจะมีผลทันทีที่บันทึก
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setIsConfigModalOpen(false)}
              disabled={isConfigSubmitting}
            >
              ยกเลิก
            </button>
            
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={handleTimeoutChange}
              disabled={isConfigSubmitting}
            >
              {isConfigSubmitting ? (
                <>
                  <span className="inline-block animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  กำลังบันทึก...
                </>
              ) : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingList;