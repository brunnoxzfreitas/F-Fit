import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Settings, User, Activity, BarChart2, Shield, LogOut, Plus, Edit2, Trash2, Play, X, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

import Cropper from 'react-easy-crop';

export default function App() {
  const [users, setUsers] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [completedWorkouts, setCompletedWorkouts] = useState<any[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [individualWorkouts, setIndividualWorkouts] = useState<any[]>([]);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [adminTab, setAdminTab] = useState('exercises');
  const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', true);
  
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '', objective: 'saude', bio: '' });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  
  // Photo upload enhancement states
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Image cropping states - removed for auto-crop
  // const [showCropModal, setShowCropModal] = useState(false);
  // const [crop, setCrop] = useState({ x: 0, y: 0 });
  // const [zoom, setZoom] = useState(1);
  // const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  // Exercise Modal state
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', muscleGroup: '', description: '', videoUrl: '', videoType: 'url' });
  const [newExerciseFile, setNewExerciseFile] = useState<File | null>(null);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [editingExerciseFile, setEditingExerciseFile] = useState<File | null>(null);
  const [playingVideo, setPlayingVideo] = useState<any>(null);

  // Instructor Modal state
  const [showInstructorModal, setShowInstructorModal] = useState(false);
  const [newInstructor, setNewInstructor] = useState({ name: '', email: '', password: '', bio: '' });

  // Student Modal state
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '', objective: 'saude' });
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Register state
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Exercise Logs state
  const [exerciseLogsInput, setExerciseLogsInput] = useState<Record<string, { reps: string, weight: string }>>({});

  // Workout Plan Builder state
  const [selectedStudentForPlan, setSelectedStudentForPlan] = useState('');
  const [showAddExerciseToPlanModal, setShowAddExerciseToPlanModal] = useState(false);
  const [selectedDayForPlan, setSelectedDayForPlan] = useState<number>(0);
  const [newPlanExercise, setNewPlanExercise] = useState({ exerciseId: '', targetReps: '', targetWeight: '' });

  // Admin Table states
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseSort, setExerciseSort] = useState('name');
  const [exercisePage, setExercisePage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [instructorSearch, setInstructorSearch] = useState('');
  const [instructorPage, setInstructorPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    // Fetch initial data from our new backend
    fetch('/api/users').then(res => res.json()).then(setUsers);
    fetch('/api/exercises').then(res => res.json()).then(setExercises);
    fetch('/api/completed-workouts').then(res => res.json()).then(setCompletedWorkouts);
    fetch('/api/workout-logs').then(res => res.json()).then(setWorkoutLogs);
    fetch('/api/workout-plans').then(res => res.json()).then(setWorkoutPlans);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        email: currentUser.email || '',
        password: '',
        objective: currentUser.objective || 'saude',
        bio: currentUser.bio || ''
      });
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, type: selectedUserType })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
      } else {
        alert(data.message || 'Credenciais inválidas!');
      }
    } catch (error) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, type: 'aluno', objective: 'saude' })
      });
      if (res.ok) {
        const newUser = await res.json();
        setUsers([...users, newUser]);
        alert('Cadastro realizado com sucesso!');
        setIsRegistering(false);
      } else {
        alert('Este email já está cadastrado!');
      }
    } catch (error) {
      alert('Erro ao conectar com o servidor.');
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newExercise.name);
      formData.append('muscleGroup', newExercise.muscleGroup);
      formData.append('description', newExercise.description);
      formData.append('videoType', newExercise.videoType);

      if (newExercise.videoType === 'url') {
        let vUrl = newExercise.videoUrl;
        if (vUrl.includes('youtube.com/watch?v=')) {
          vUrl = `https://www.youtube.com/embed/${vUrl.split('v=')[1].split('&')[0]}`;
        } else if (vUrl.includes('youtu.be/')) {
          vUrl = `https://www.youtube.com/embed/${vUrl.split('youtu.be/')[1].split('?')[0]}`;
        }
        formData.append('videoUrl', vUrl);
      } else if (newExercise.videoType === 'upload' && newExerciseFile) {
        formData.append('videoFile', newExerciseFile);
      }

      const res = await fetch('/api/exercises', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const addedExercise = await res.json();
        setExercises([...exercises, addedExercise]);
        setShowExerciseModal(false);
        setNewExercise({ name: '', muscleGroup: '', description: '', videoUrl: '', videoType: 'url' });
        setNewExerciseFile(null);
        alert('Exercício cadastrado com sucesso!');
      }
    } catch (error) {
      alert('Erro ao cadastrar exercício.');
    }
  };

  const handleUpdateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise) return;
    
    try {
      const formData = new FormData();
      formData.append('name', editingExercise.name);
      formData.append('muscleGroup', editingExercise.muscleGroup);
      formData.append('description', editingExercise.description);
      formData.append('videoType', editingExercise.videoType);

      if (editingExercise.videoType === 'url') {
        let vUrl = editingExercise.videoUrl !== undefined ? editingExercise.videoUrl : editingExercise.video;
        if (vUrl && vUrl.includes('youtube.com/watch?v=')) {
          vUrl = `https://www.youtube.com/embed/${vUrl.split('v=')[1].split('&')[0]}`;
        } else if (vUrl && vUrl.includes('youtu.be/')) {
          vUrl = `https://www.youtube.com/embed/${vUrl.split('youtu.be/')[1].split('?')[0]}`;
        }
        formData.append('videoUrl', vUrl || '');
      } else if (editingExercise.videoType === 'upload' && editingExerciseFile) {
        formData.append('videoFile', editingExerciseFile);
      } else if (editingExercise.videoType === 'upload' && !editingExerciseFile) {
        formData.append('videoUrl', editingExercise.video);
      }

      const res = await fetch(`/api/exercises/${editingExercise.id}`, {
        method: 'PUT',
        body: formData
      });
      if (res.ok) {
        const updatedExercise = await res.json();
        setExercises(exercises.map(ex => ex.id === updatedExercise.id ? updatedExercise : ex));
        setEditingExercise(null);
        setEditingExerciseFile(null);
        alert('Exercício atualizado com sucesso!');
      }
    } catch (error) {
      alert('Erro ao atualizar exercício.');
    }
  };

  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newInstructor.password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newInstructor.name, 
          email: newInstructor.email, 
          password: newInstructor.password, 
          type: 'instrutor', 
          bio: newInstructor.bio,
          requesterId: currentUser.id
        })
      });
      if (res.ok) {
        const addedInstructor = await res.json();
        setUsers([...users, addedInstructor]);
        setShowInstructorModal(false);
        setNewInstructor({ name: '', email: '', password: '', bio: '' });
        alert('Instrutor cadastrado com sucesso!');
      } else {
        alert('Este email já está cadastrado!');
      }
    } catch (error) {
      alert('Erro ao cadastrar instrutor.');
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudent.password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres!');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newStudent.name, 
          email: newStudent.email, 
          password: newStudent.password, 
          type: 'aluno', 
          objective: newStudent.objective,
          requesterId: currentUser.id
        })
      });
      if (res.ok) {
        const addedStudent = await res.json();
        setUsers([...users, addedStudent]);
        setShowStudentModal(false);
        setNewStudent({ name: '', email: '', password: '', objective: 'saude' });
        alert('Aluno cadastrado com sucesso!');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Este email já está cadastrado!');
      }
    } catch (error) {
      alert('Erro ao cadastrar aluno.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setSelectedUserType('');
    setActiveTab('dashboard');
  };

  // Photo upload utility functions
  const validateFile = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (file.size > maxSize) {
      return 'Arquivo muito grande. Máximo 5MB permitido.';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Tipo de arquivo não permitido. Use apenas JPG, PNG ou WebP.';
    }

    return null;
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 800px width/height)
        let { width, height } = img;
        const maxDimension = 800;

        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // fallback to original
          }
        }, file.type, 0.8); // 80% quality
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const resetUploadState = () => {
    setPreviewImage(null);
    setUploadProgress(0);
    setUploadError(null);
    setIsDragging(false);
    setIsCompressing(false);
  };

  const cropImageToSquare = (imageSrc: string): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        canvas.width = 300; // Fixed size for profile photos
        canvas.height = 300;

        ctx.drawImage(img, x, y, size, size, 0, 0, 300, 300);

        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], 'profile-photo.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          }
        }, 'image/jpeg', 0.9);
      };

      img.src = imageSrc;
    });
  };

  const handleFileSelect = async (file: File) => {
    resetUploadState();
    
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsCompressing(true);
    try {
      const compressedFile = await compressImage(file);
      
      // Create preview and auto-crop
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageSrc = e.target?.result as string;
        setPreviewImage(imageSrc);
        
        // Auto-crop to square
        const croppedFile = await cropImageToSquare(imageSrc);
        setProfilePhotoFile(croppedFile);
        setCroppedImage(URL.createObjectURL(croppedFile));
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      setUploadError('Erro ao processar a imagem.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setProfilePhotoFile(null);
    resetUploadState();
    setCroppedImage(null);
    setShowCropModal(false);
  };

  // Crop functions
  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createCroppedImage = async () => {
    if (!previewImage || !croppedAreaPixels) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    return new Promise<File>((resolve) => {
      img.onload = () => {
        const { width, height, x, y } = croppedAreaPixels;
        
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], 'cropped-image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          }
        }, 'image/jpeg', 0.9);
      };

      img.src = previewImage;
    });
  };

  const handleApplySimpleCrop = async () => {
    if (!previewImage) return;

    try {
      setIsCompressing(true);
      const croppedFile = await cropImageToSquare(previewImage);
      setProfilePhotoFile(croppedFile);
      setCroppedImage(URL.createObjectURL(croppedFile));
      setShowCropModal(false);
      setPreviewImage(null);
    } catch (error) {
      setUploadError('Erro ao cortar a imagem.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCancelCrop = () => {
    setShowCropModal(false);
    setPreviewImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('name', profileForm.name);
      formData.append('email', profileForm.email);
      formData.append('objective', profileForm.objective);
      formData.append('bio', profileForm.bio);
      if (profileForm.password) {
        formData.append('password', profileForm.password);
      }
      if (profilePhotoFile) {
        formData.append('photo', profilePhotoFile);
        setUploadProgress(50); // Simulate progress
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        body: formData
      });
      
      setUploadProgress(100);
      
      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
        alert('Perfil atualizado com sucesso!');
        setProfileForm({ ...profileForm, password: '' });
        setProfilePhotoFile(null);
        resetUploadState();
      } else {
        const errorData = await res.json();
        setUploadError(errorData.error || 'Erro ao atualizar perfil.');
      }
    } catch (error) {
      setUploadError('Erro ao atualizar perfil.');
    } finally {
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/embed\/([^?]+)/);
    return match ? match[1] : null;
  };

  // Prepare chart data based on completed workouts
  const chartData = useMemo(() => {
    if (!currentUser) return [];
    
    const userWorkouts = completedWorkouts.filter(w => w.userId === currentUser.id);
    
    // Group by day of week (0 = Sunday, 1 = Monday, etc.)
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data = days.map(day => ({ name: day, treinos: 0 }));
    
    userWorkouts.forEach(workout => {
      // workout.dayIndex is 0 for Monday, 6 for Sunday in our current logic
      // Let's map it to our days array: 0 -> Seg, 1 -> Ter, ..., 6 -> Dom
      let displayIndex = workout.dayIndex + 1;
      if (displayIndex === 7) displayIndex = 0; // Sunday
      
      data[displayIndex].treinos += 1;
    });
    
    // Reorder to start from Monday
    return [
      data[1], // Seg
      data[2], // Ter
      data[3], // Qua
      data[4], // Qui
      data[5], // Sex
      data[6], // Sáb
      data[0], // Dom
    ];
  }, [completedWorkouts, currentUser]);

  const filteredExercises = useMemo(() => {
    let filtered = exercises.filter(ex => 
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(exerciseSearch.toLowerCase())
    );
    
    filtered.sort((a, b) => {
      if (exerciseSort === 'name') return a.name.localeCompare(b.name);
      if (exerciseSort === 'muscleGroup') return a.muscleGroup.localeCompare(b.muscleGroup);
      return 0;
    });

    const start = (exercisePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [exercises, exerciseSearch, exerciseSort, exercisePage]);

  const filteredStudents = useMemo(() => {
    const filtered = users.filter(u => 
      u.type === 'aluno' && 
      (u.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
       u.email.toLowerCase().includes(studentSearch.toLowerCase()))
    );

    const start = (studentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [users, studentSearch, studentPage]);

  const filteredInstructors = useMemo(() => {
    const filtered = users.filter(u => 
      u.type === 'instrutor' && 
      (u.name.toLowerCase().includes(instructorSearch.toLowerCase()) || 
       u.email.toLowerCase().includes(instructorSearch.toLowerCase()))
    );

    const start = (instructorPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [users, instructorSearch, instructorPage]);

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8 relative z-10 min-h-screen flex flex-col items-center justify-center">
        {/* Floating Background Icons */}
        <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <span className="floating-icon" style={{ top: '15%', left: '10%', animationDelay: '0s', fontSize: '3rem' }}>💪</span>
          <span className="floating-icon" style={{ top: '25%', right: '15%', animationDelay: '2s', fontSize: '2.5rem' }}>🏋️‍♂️</span>
          <span className="floating-icon" style={{ bottom: '20%', left: '15%', animationDelay: '4s', fontSize: '3.5rem' }}>🔥</span>
          <span className="floating-icon" style={{ bottom: '30%', right: '10%', animationDelay: '1s', fontSize: '2.8rem' }}>🎯</span>
          <span className="floating-icon" style={{ top: '50%', left: '5%', animationDelay: '3s', fontSize: '2.2rem' }}>🤸‍♂️</span>
          <span className="floating-icon" style={{ top: '60%', right: '5%', animationDelay: '5s', fontSize: '3.2rem' }}>🚀</span>
          <span className="floating-icon" style={{ top: '10%', right: '40%', animationDelay: '1.5s', fontSize: '2.6rem' }}>💎</span>
          <span className="floating-icon" style={{ bottom: '10%', left: '40%', animationDelay: '3.5s', fontSize: '3rem' }}>⭐</span>
        </div>

        <div className="text-center mb-10 relative z-10">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black mb-2 sm:mb-4 title-glow tracking-tighter">F-fit</h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 font-light drop-shadow-md px-4">Sistema de Treinos de Academia</p>
        </div>

        <div className="glass-panel rounded-[25px] p-6 sm:p-8 md:p-12 w-full max-w-md relative overflow-hidden z-10">
          <h2 className="text-3xl font-bold text-center mb-8 text-white">{isRegistering ? 'Cadastrar' : 'Entrar'}</h2>
          
          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-2">Nome:</label>
                <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} className="glass-input w-full p-4 rounded-xl" placeholder="Seu nome" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-2">Email:</label>
                <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} className="glass-input w-full p-4 rounded-xl" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-2">Senha:</label>
                <input type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} className="glass-input w-full p-4 rounded-xl" placeholder="123456" />
              </div>
              <button type="submit" className="btn-primary w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider">Cadastrar</button>
              <p className="text-center text-white/80 mt-4">
                Já tem conta? <button type="button" onClick={() => setIsRegistering(false)} className="text-white font-bold underline">Entrar</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-2">Tipo de Usuário:</label>
                <button 
                  type="button" 
                  onClick={() => setShowUserTypeModal(true)}
                  className="glass-input w-full p-4 rounded-xl flex justify-between items-center text-left"
                >
                  <span>{selectedUserType ? selectedUserType.charAt(0).toUpperCase() + selectedUserType.slice(1) : 'Selecione o tipo de usuário'}</span>
                  <ChevronDown size={20} />
                </button>
              </div>
              
              <div>
                <label className="block text-white font-semibold mb-2">Email:</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="glass-input w-full p-4 rounded-xl" placeholder="seu@email.com" />
              </div>
              
              <div>
                <label className="block text-white font-semibold mb-2">Senha:</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="glass-input w-full p-4 rounded-xl" placeholder="123456" />
              </div>
              
              <button type="submit" className="btn-primary w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider">Entrar</button>
              <p className="text-center text-white/80 mt-4">
                Não tem conta? <button type="button" onClick={() => setIsRegistering(true)} className="text-white font-bold underline">Cadastrar</button>
              </p>
            </form>
          )}
        </div>

        {showUserTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="glass-panel p-6 sm:p-8 rounded-[25px] w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowUserTypeModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold text-center mb-8 text-white">Selecione o Tipo de Usuário</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div onClick={() => { setSelectedUserType('aluno'); setShowUserTypeModal(false); }} className="glass-card p-6 rounded-2xl text-center cursor-pointer hover:border-white/40">
                  <span className="text-5xl mb-4 block">💪</span>
                  <h4 className="text-xl font-bold text-white mb-2">Aluno</h4>
                  <p className="text-white/80 text-sm">Acesse seus treinos personalizados e acompanhe seu progresso.</p>
                </div>
                <div onClick={() => { setSelectedUserType('instrutor'); setShowUserTypeModal(false); }} className="glass-card p-6 rounded-2xl text-center cursor-pointer hover:border-white/40">
                  <span className="text-5xl mb-4 block">👨‍🏫</span>
                  <h4 className="text-xl font-bold text-white mb-2">Instrutor</h4>
                  <p className="text-white/80 text-sm">Gerencie exercícios, crie planos de treino e acompanhe alunos.</p>
                </div>
                <div onClick={() => { setSelectedUserType('admin'); setShowUserTypeModal(false); }} className="glass-card p-6 rounded-2xl text-center cursor-pointer hover:border-white/40">
                  <span className="text-5xl mb-4 block">👑</span>
                  <h4 className="text-xl font-bold text-white mb-2">Administrador</h4>
                  <p className="text-white/80 text-sm">Acesso total ao sistema, gerencie todos os usuários.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 relative z-10 max-w-6xl">
      <div className="glass-card p-5 sm:p-6 rounded-2xl mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold border-2 border-white/20 overflow-hidden">
            {currentUser.photo ? (
              <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name.charAt(0)
            )}
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">Bem-vindo, {currentUser.name}!</h3>
            <p className="text-white/80 capitalize">Tipo: {currentUser.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
          <button onClick={() => setActiveTab('settings')} className={`btn-secondary p-3 rounded-xl flex-shrink-0 transition-all ${activeTab === 'settings' ? 'bg-white/20 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : ''}`} title="Configurações">
            <Settings size={18} />
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="btn-secondary p-3 rounded-xl flex-shrink-0" title="Alternar Tema">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-full p-2 mb-6 sm:mb-8 flex flex-wrap justify-center gap-1 sm:gap-2 sticky top-4 z-40 mx-auto w-fit shadow-lg border border-white/20 backdrop-blur-xl">
        <button onClick={() => setActiveTab('profile')} className={`nav-tab px-4 py-2 sm:px-6 sm:py-2.5 rounded-full flex items-center gap-2 text-sm sm:text-base font-semibold transition-all ${activeTab === 'profile' ? 'active' : ''}`}>
          <User size={16} className="sm:w-[18px] sm:h-[18px]" /> <span>Perfil</span>
        </button>
        <button onClick={() => setActiveTab('workouts')} className={`nav-tab px-4 py-2 sm:px-6 sm:py-2.5 rounded-full flex items-center gap-2 text-sm sm:text-base font-semibold transition-all ${activeTab === 'workouts' ? 'active' : ''}`}>
          <Activity size={16} className="sm:w-[18px] sm:h-[18px]" /> <span>Treinos</span>
        </button>
        <button onClick={() => setActiveTab('progress')} className={`nav-tab px-4 py-2 sm:px-6 sm:py-2.5 rounded-full flex items-center gap-2 text-sm sm:text-base font-semibold transition-all ${activeTab === 'progress' ? 'active' : ''}`}>
          <BarChart2 size={16} className="sm:w-[18px] sm:h-[18px]" /> <span>Progresso</span>
        </button>
        {(currentUser.type === 'instrutor' || currentUser.type === 'admin') && (
          <button onClick={() => setActiveTab('admin')} className={`nav-tab px-4 py-2 sm:px-6 sm:py-2.5 rounded-full flex items-center gap-2 text-sm sm:text-base font-semibold transition-all ${activeTab === 'admin' ? 'active' : ''}`}>
            <Shield size={16} className="sm:w-[18px] sm:h-[18px]" /> <span>Admin</span>
          </button>
        )}
      </div>

      <div className="mt-6 sm:mt-8">
        {activeTab === 'profile' && (
          <div className="glass-card p-5 sm:p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><User /> Meu Perfil</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20 overflow-hidden">
                    {currentUser.photo ? (
                      <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">{currentUser.name}</h4>
                    <p className="text-white/80 capitalize">{currentUser.type}</p>
                  </div>
                </div>
                <p className="text-white/90 text-lg"><strong className="text-white">Email:</strong> {currentUser.email}</p>
                {currentUser.age && <p className="text-white/90 text-lg"><strong className="text-white">Idade:</strong> {currentUser.age}</p>}
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-4 mt-6 lg:mt-0">Estatísticas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-panel p-5 sm:p-6 rounded-xl text-center">
                    <div className="text-4xl font-black text-gradient mb-2">{completedWorkouts.filter(w => w.userId === currentUser.id).length}</div>
                    <div className="text-white/80 text-sm font-medium">Treinos Realizados</div>
                  </div>
                  <div className="glass-panel p-5 sm:p-6 rounded-xl text-center">
                    <div className="text-4xl font-black text-gradient mb-2">{Math.floor(completedWorkouts.filter(w => w.userId === currentUser.id).length / 3)}</div>
                    <div className="text-white/80 text-sm font-medium">Semanas Seguidas</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h4 className="text-xl font-bold text-white mb-4">Frequência de Treinos</h4>
              <div className="glass-panel p-4 sm:p-6 rounded-xl h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.8)' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.8)' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(20,20,20,0.8)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: '#fff' }}
                      itemStyle={{ color: '#f093fb' }}
                    />
                    <Bar dataKey="treinos" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f093fb" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#667eea" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="glass-card p-5 sm:p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Settings /> Configurações</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-panel p-6 rounded-2xl">
                <h4 className="text-lg font-bold text-white mb-4">Editar Perfil</h4>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-white font-semibold mb-1">Nome:</label>
                    <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="glass-input w-full p-3 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-1">Email:</label>
                    <input type="email" required value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="glass-input w-full p-3 rounded-xl" />
                  </div>
                  {currentUser.type === 'aluno' && (
                    <div>
                      <label className="block text-white font-semibold mb-1">Objetivo:</label>
                      <select required value={profileForm.objective} onChange={e => setProfileForm({...profileForm, objective: e.target.value})} className="glass-input w-full p-3 rounded-xl text-black">
                        <option value="hipertrofia">Hipertrofia</option>
                        <option value="emagrecimento">Emagrecimento</option>
                        <option value="forca">Força</option>
                        <option value="resistencia">Resistência</option>
                        <option value="saude">Saúde e Bem-estar</option>
                      </select>
                    </div>
                  )}
                  {currentUser.type === 'instrutor' && (
                    <div>
                      <label className="block text-white font-semibold mb-1">Biografia:</label>
                      <textarea value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="glass-input w-full p-3 rounded-xl" rows={3}></textarea>
                    </div>
                  )}
                  <div>
                    <label className="block text-white font-semibold mb-2">Foto do Perfil:</label>
                    
                    {/* Drag and drop area */}
                    <div 
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                        isDragging 
                          ? 'border-indigo-400 bg-indigo-500/10' 
                          : 'border-white/30 hover:border-white/50'
                      } ${previewImage ? 'bg-white/5' : 'bg-white/5'}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {previewImage ? (
                        <div className="space-y-3">
                          <div className="flex justify-center">
                            <img 
                              src={previewImage} 
                              alt="Preview" 
                              className="w-20 h-20 rounded-full object-cover border-2 border-white/20" 
                            />
                          </div>
                          <p className="text-white/80 text-sm">Nova foto selecionada</p>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="text-red-400 hover:text-red-300 text-sm underline"
                          >
                            Remover foto
                          </button>
                        </div>
                      ) : currentUser.photo ? (
                        <div className="space-y-3">
                          <div className="flex justify-center">
                            <img 
                              src={currentUser.photo} 
                              alt="Foto atual" 
                              className="w-20 h-20 rounded-full object-cover border-2 border-white/20" 
                            />
                          </div>
                          <p className="text-white/80 text-sm">Foto atual</p>
                          <div className="flex justify-center gap-2">
                            <label className="btn-secondary text-sm px-3 py-1 cursor-pointer">
                              Alterar
                              <input 
                                type="file" 
                                accept="image/jpeg,image/jpg,image/png,image/webp" 
                                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="text-red-400 hover:text-red-300 text-sm underline"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-4xl">📷</div>
                          <div>
                            <p className="text-white font-medium">Arraste uma foto aqui</p>
                            <p className="text-white/60 text-sm">ou</p>
                            <label className="btn-secondary text-sm px-4 py-2 cursor-pointer inline-block">
                              Selecionar arquivo
                              <input 
                                type="file" 
                                accept="image/jpeg,image/jpg,image/png,image/webp" 
                                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="text-white/50 text-xs">JPG, PNG, WebP até 5MB</p>
                        </div>
                      )}
                      
                      {/* Loading states */}
                      {isCompressing && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-sm">Comprimindo imagem...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Upload progress */}
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="text-white text-center w-full max-w-xs">
                            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                              <div 
                                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-sm">Enviando... {uploadProgress}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Error message */}
                    {uploadError && (
                      <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                        <span>⚠️</span> {uploadError}
                      </p>
                    )}
                    
                    {/* File size info */}
                    {profilePhotoFile && (
                      <p className="text-white/60 text-xs mt-1">
                        Tamanho: {(profilePhotoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-1">Nova Senha (opcional):</label>
                    <input type="password" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Deixe em branco para manter a atual" />
                  </div>
                  <button type="submit" className="btn-primary w-full py-3 rounded-xl font-bold text-lg mt-4">Salvar Alterações</button>
                </form>
              </div>

              <div className="glass-panel p-6 rounded-2xl h-fit">
                <h4 className="text-lg font-bold text-red-400 mb-4">Sessão</h4>
                <button onClick={handleLogout} className="w-full py-3 rounded-xl font-bold text-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <LogOut size={20} /> Sair da Conta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Crop Modal - Removed for auto-crop */}
        {/* {showCropModal && previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Crop size={20} /> Ajustar Foto
                </h3>
                <button 
                  onClick={handleCancelCrop}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="relative h-80 bg-black/20 rounded-xl overflow-hidden">
                  <Cropper
                    image={previewImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    cropShape="round"
                    showGrid={false}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Zoom:</label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-white/60 mt-1">
                      <span>1x</span>
                      <span>3x</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelCrop}
                      className="flex-1 py-3 px-4 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleApplyCrop}
                      className="flex-1 py-3 px-4 rounded-xl font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={18} /> Aplicar Corte
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )} */}

        {activeTab === 'workouts' && (
          <div className="glass-card p-5 sm:p-8 rounded-2xl">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2"><Activity /> Plano Semanal</h3>
            
            {currentUser.type !== 'aluno' && (
              <div className="mb-8">
                <label className="block text-white font-semibold mb-2">Selecione um Aluno para ver/editar o plano:</label>
                <div className="relative">
                  <select 
                    value={selectedStudentForPlan} 
                    onChange={e => setSelectedStudentForPlan(e.target.value)} 
                    className="glass-input w-full p-3 rounded-xl appearance-none pr-10"
                  >
                    <option value="" className="text-black">Selecione um aluno...</option>
                    {users.filter(u => u.type === 'aluno').map(student => (
                      <option key={student.id} value={student.id} className="text-black flex items-center gap-2">
                        {student.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown size={16} className="text-white/60" />
                  </div>
                </div>
                
                {/* Student selection cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {users.filter(u => u.type === 'aluno').map(student => (
                    <div 
                      key={student.id}
                      onClick={() => setSelectedStudentForPlan(student.id.toString())}
                      className={`glass-panel p-3 rounded-xl cursor-pointer border transition-all hover:border-white/40 ${
                        selectedStudentForPlan === student.id.toString() 
                          ? 'border-blue-400 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold border border-white/20 overflow-hidden flex-shrink-0">
                          {student.photo && student.photo.trim() !== '' ? (
                            <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            student.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-semibold text-white text-sm truncate">{student.name}</h5>
                          <p className="text-white/60 text-xs truncate">{student.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(currentUser.type === 'aluno' || selectedStudentForPlan) ? (
              <>
                {currentUser.type !== 'aluno' && selectedStudentForPlan && (
                  <div className="flex justify-end mb-4">
                    <button 
                      onClick={async () => {
                        if(confirm('Excluir TODO o plano semanal deste aluno?')) {
                          const targetStudentId = parseInt(selectedStudentForPlan);
                          await fetch(`/api/workout-plans/student/${targetStudentId}`, { method: 'DELETE' });
                          setWorkoutPlans(workoutPlans.filter(p => p.studentId !== targetStudentId));
                          alert('Plano excluído com sucesso!');
                        }
                      }}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Excluir Plano Completo
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day, idx) => {
                  const targetStudentId = currentUser.type === 'aluno' ? currentUser.id : parseInt(selectedStudentForPlan);
                  const dayExercises = workoutPlans.filter(p => p.studentId === targetStudentId && p.dayIndex === idx);
                  const isCompletedToday = completedWorkouts.some(w => 
                    w.userId === targetStudentId && 
                    w.dayIndex === idx && 
                    new Date(w.date).toDateString() === new Date().toDateString()
                  );
                  
                  return (
                    <div key={day} className="glass-panel p-5 sm:p-6 rounded-xl border-l-4 border-l-indigo-500 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg sm:text-xl font-bold text-white">{day}</h4>
                        {currentUser.type !== 'aluno' && (
                          <div className="flex gap-2">
                            {dayExercises.length > 0 && (
                              <button 
                                onClick={async () => {
                                  if(confirm(`Limpar todos os exercícios de ${day}?`)) {
                                    const targetStudentId = currentUser.type === 'aluno' ? currentUser.id : parseInt(selectedStudentForPlan);
                                    // Delete one by one for now as we don't have a bulk day delete endpoint
                                    // but we update state once at the end
                                    await Promise.all(dayExercises.map(ex => 
                                      fetch(`/api/workout-plans/${ex.id}`, { method: 'DELETE' })
                                    ));
                                    setWorkoutPlans(workoutPlans.filter(p => !(p.studentId === targetStudentId && p.dayIndex === idx)));
                                  }
                                }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-colors"
                                title="Limpar dia"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedDayForPlan(idx);
                                setShowAddExerciseToPlanModal(true);
                              }}
                              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 sm:space-y-4 flex-1">
                        {dayExercises.length === 0 ? (
                          <p className="text-white/50 text-sm text-center py-4">Nenhum exercício para este dia.</p>
                        ) : (
                          dayExercises.map(ex => {
                            const logKey = `${day}-${ex.exerciseId}`;
                            const currentLog = exerciseLogsInput[logKey] || { reps: '', weight: '' };
                            return (
                              <div key={ex.id} className="bg-white/5 p-3 sm:p-4 rounded-lg border border-white/10 overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-bold text-white text-sm sm:text-base">{ex.exerciseName}</h5>
                                  {currentUser.type !== 'aluno' && (
                                    <button 
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        console.log(`Attempting to delete workout plan: ${ex.id}`);
                                        if(confirm('Remover este exercício do plano semanal?')) {
                                          try {
                                            const res = await fetch(`/api/workout-plans/${ex.id}`, { method: 'DELETE' });
                                            console.log(`Delete response status: ${res.status}`);
                                            if (res.ok) {
                                              setWorkoutPlans(workoutPlans.filter(p => p.id !== ex.id));
                                            } else {
                                              alert('Erro ao excluir exercício do plano.');
                                            }
                                          } catch (err) {
                                            console.error('Delete error:', err);
                                            alert('Erro de conexão ao excluir.');
                                          }
                                        }
                                      }}
                                      className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all p-2 rounded-lg"
                                      title="Remover exercício do plano"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                                
                                {ex.targetReps && <p className="text-white/70 text-xs mb-2">Meta: {ex.targetReps} {ex.targetWeight ? `- ${ex.targetWeight}kg` : ''}</p>}
                                
                                {/* Video Preview */}
                                {ex.video && (
                                  <div className="relative h-24 sm:h-32 bg-black/40 rounded-lg mb-3 group overflow-hidden">
                                    {ex.videoType === 'upload' ? (
                                      <>
                                        <video src={ex.video} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                        <button onClick={() => setPlayingVideo(ex)} className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                                            <Play className="text-white ml-1" size={20} fill="currentColor" />
                                          </div>
                                        </button>
                                      </>
                                    ) : getYoutubeId(ex.video) ? (
                                      <>
                                        <img src={`https://img.youtube.com/vi/${getYoutubeId(ex.video)}/hqdefault.jpg`} alt={ex.exerciseName} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                        <button onClick={() => setPlayingVideo(ex)} className="absolute inset-0 flex items-center justify-center">
                                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                                            <Play className="text-white ml-1" size={20} fill="currentColor" />
                                          </div>
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                )}

                                {currentUser.type === 'aluno' && (
                                  <div className="mt-3">
                                    <div className="flex gap-2 mb-2">
                                      <div className="flex-1">
                                        <label className="text-[10px] text-white/50 uppercase tracking-wider">Repetições Feitas</label>
                                        <input 
                                          type="number" 
                                          placeholder="Ex: 12" 
                                          className="glass-input w-full p-2 rounded-lg text-sm"
                                          value={currentLog.reps}
                                          onChange={e => setExerciseLogsInput({...exerciseLogsInput, [logKey]: { ...currentLog, reps: e.target.value }})}
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="text-[10px] text-white/50 uppercase tracking-wider">Carga Usada (kg)</label>
                                        <input 
                                          type="number" 
                                          placeholder="Ex: 20" 
                                          className="glass-input w-full p-2 rounded-lg text-sm"
                                          value={currentLog.weight}
                                          onChange={e => setExerciseLogsInput({...exerciseLogsInput, [logKey]: { ...currentLog, weight: e.target.value }})}
                                        />
                                      </div>
                                    </div>
                                    <button 
                                      onClick={async () => {
                                        if (!currentLog.reps || !currentLog.weight) {
                                          alert('Preencha as repetições e a carga antes de concluir o exercício.');
                                          return;
                                        }
                                        const res = await fetch('/api/workout-logs', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            userId: currentUser.id,
                                            exerciseId: ex.exerciseId,
                                            reps: parseInt(currentLog.reps),
                                            weight: parseFloat(currentLog.weight),
                                            date: new Date().toISOString()
                                          })
                                        });
                                        if (res.ok) {
                                          const newLog = await res.json();
                                          setWorkoutLogs([newLog, ...workoutLogs]);
                                          setExerciseLogsInput({...exerciseLogsInput, [logKey]: { reps: '', weight: '' }});
                                          alert('Exercício registrado com sucesso!');
                                        }
                                      }}
                                      className="w-full py-2 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-colors text-sm font-bold"
                                    >
                                      Concluir Exercício
                                    </button>
                                  </div>
                                )}

                                {/* Today's Logs for this exercise */}
                                {workoutLogs.some(log => 
                                  log.userId === targetStudentId && 
                                  log.exerciseId === ex.exerciseId && 
                                  new Date(log.date).toDateString() === new Date().toDateString()
                                ) && (
                                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Registros de Hoje</p>
                                    {workoutLogs
                                      .filter(log => 
                                        log.userId === targetStudentId && 
                                        log.exerciseId === ex.exerciseId && 
                                        new Date(log.date).toDateString() === new Date().toDateString()
                                      )
                                      .map(log => (
                                        <div key={log.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5 text-xs">
                                          <span className="text-white/70">
                                            {currentUser.type === 'aluno' ? 'Você: ' : 'Aluno: '}
                                            <span className="font-bold text-white">{log.reps} reps @ {log.weight}kg</span>
                                          </span>
                                          <button 
                                            onClick={async () => {
                                              console.log(`Attempting to delete workout log: ${log.id}`);
                                              if(confirm('Excluir este registro de exercício?')) {
                                                const res = await fetch(`/api/workout-logs/${log.id}`, { method: 'DELETE' });
                                                console.log(`Delete log response status: ${res.status}`);
                                                if (res.ok) {
                                                  setWorkoutLogs(workoutLogs.filter(l => l.id !== log.id));
                                                } else {
                                                  alert('Erro ao excluir registro.');
                                                }
                                              }
                                            }}
                                            className="text-red-400 hover:text-red-300 p-1 transition-colors"
                                            title="Excluir registro"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      ))
                                    }
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                      {dayExercises.length > 0 && (
                        <>
                          {isCompletedToday ? (
                            <button 
                              onClick={async () => {
                                const workoutToDelete = completedWorkouts.find(w => 
                                  w.userId === targetStudentId && 
                                  w.dayIndex === idx && 
                                  new Date(w.date).toDateString() === new Date().toDateString()
                                );
                                if (workoutToDelete && confirm('Desmarcar este dia como concluído?')) {
                                  await fetch(`/api/completed-workouts/${workoutToDelete.id}`, { method: 'DELETE' });
                                  setCompletedWorkouts(completedWorkouts.filter(cw => cw.id !== workoutToDelete.id));
                                  alert('Treino desmarcado!');
                                }
                              }}
                              className="w-full mt-5 sm:mt-6 py-3 rounded-lg font-bold text-sm sm:text-base bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                            >
                              Desmarcar Dia como Concluído
                            </button>
                          ) : (
                            <button 
                              onClick={async () => {
                                // Save completed workout
                                const res = await fetch('/api/completed-workouts', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: targetStudentId, dayIndex: idx, date: new Date().toISOString() })
                                });
                                if (res.ok) {
                                  const newWorkout = await res.json();
                                  setCompletedWorkouts([...completedWorkouts, newWorkout]);
                                  alert('Dia de treino marcado como concluído!');
                                }
                              }}
                              className="btn-primary w-full mt-5 sm:mt-6 py-3 rounded-lg font-bold text-sm sm:text-base"
                            >
                              Marcar Dia como Concluído
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
              <p className="text-white/80 text-center py-8">Selecione um aluno para visualizar o plano de treinos.</p>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="glass-card p-5 sm:p-8 rounded-2xl">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2"><BarChart2 /> Meu Progresso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="glass-panel p-6 sm:p-8 rounded-xl text-center">
                <div className="text-5xl font-black text-gradient mb-4">
                  {completedWorkouts.filter(w => w.userId === currentUser.id).length}
                </div>
                <div className="text-white/80 text-lg font-medium">Total de Treinos Concluídos</div>
              </div>
              <div className="glass-panel p-8 rounded-xl text-center">
                <div className="text-5xl font-black text-gradient mb-4">
                  {Math.min(Math.round((completedWorkouts.filter(w => w.userId === currentUser.id).length / 5) * 100), 100)}%
                </div>
                <div className="text-white/80 text-lg font-medium">Meta Semanal Atingida</div>
                <div className="w-full bg-white/10 h-3 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                    style={{ width: `${Math.min(Math.round((completedWorkouts.filter(w => w.userId === currentUser.id).length / 5) * 100), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-xl font-bold text-white mb-4">Treinos Concluídos</h4>
              <div className="glass-panel p-4 sm:p-6 rounded-xl max-h-64 overflow-y-auto">
                {completedWorkouts.filter(w => w.userId === currentUser.id).length === 0 ? (
                  <p className="text-white/60 text-center py-4">Nenhum treino concluído ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {completedWorkouts.filter(w => w.userId === currentUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(w => (
                      <div key={w.id} className="bg-white/5 p-4 rounded-lg border border-white/10 flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-white">{['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][w.dayIndex]}</h5>
                          <p className="text-white/50 text-xs">{new Date(w.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                        </div>
                        <button 
                          onClick={async () => {
                            if(confirm('Excluir este registro de treino concluído?')) {
                              await fetch(`/api/completed-workouts/${w.id}`, { method: 'DELETE' });
                              setCompletedWorkouts(completedWorkouts.filter(cw => cw.id !== w.id));
                            }
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Excluir registro"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-xl font-bold text-white mb-4">Histórico de Exercícios</h4>
              <div className="glass-panel p-4 sm:p-6 rounded-xl max-h-96 overflow-y-auto">
                {workoutLogs.filter(log => log.userId === currentUser.id).length === 0 ? (
                  <p className="text-white/60 text-center py-4">Nenhum exercício registrado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {workoutLogs.filter(log => log.userId === currentUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                      <div key={log.id} className="bg-white/5 p-4 rounded-lg border border-white/10 flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-white">{log.exerciseName}</h5>
                          <p className="text-white/50 text-xs">{new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex gap-4 text-right items-center">
                          <div className="flex gap-4">
                            <div>
                              <p className="text-[10px] text-white/50 uppercase tracking-wider">Repetições</p>
                              <p className="font-bold text-white">{log.reps}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-white/50 uppercase tracking-wider">Carga</p>
                              <p className="font-bold text-white">{log.weight} kg</p>
                            </div>
                          </div>
                          <button 
                            onClick={async () => {
                              if(confirm('Excluir este registro de exercício?')) {
                                await fetch(`/api/workout-logs/${log.id}`, { method: 'DELETE' });
                                setWorkoutLogs(workoutLogs.filter(l => l.id !== log.id));
                              }
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors ml-2"
                            title="Excluir registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="glass-card p-5 sm:p-8 rounded-2xl">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2"><Shield /> Administração</h3>
            
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 border-b border-white/10 pb-4">
              <button onClick={() => setAdminTab('exercises')} className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${adminTab === 'exercises' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>Exercícios</button>
              <button onClick={() => setAdminTab('students')} className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${adminTab === 'students' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>Alunos</button>
              {currentUser.type === 'admin' && (
                <button onClick={() => setAdminTab('instructors')} className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${adminTab === 'instructors' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>Instrutores</button>
              )}
            </div>

            {adminTab === 'exercises' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                  <h4 className="text-lg sm:text-xl font-bold text-white">Exercícios Cadastrados</h4>
                  <button onClick={() => { setEditingExercise(null); setShowExerciseModal(true); }} className="btn-primary w-full sm:w-auto px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm sm:text-base">
                    <Plus size={18} /> Novo Exercício
                  </button>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar exercício..." 
                      className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-sm"
                      value={exerciseSearch}
                      onChange={(e) => { setExerciseSearch(e.target.value); setExercisePage(1); }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="glass-input px-4 py-2 rounded-xl text-sm text-white bg-transparent"
                      value={exerciseSort}
                      onChange={(e) => setExerciseSort(e.target.value)}
                    >
                      <option value="name" className="text-black">Nome (A-Z)</option>
                      <option value="muscleGroup" className="text-black">Grupo Muscular</option>
                    </select>
                  </div>
                </div>

                {/* Exercises Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredExercises.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-white/40">Nenhum exercício encontrado.</div>
                  ) : (
                    filteredExercises.map(ex => (
                      <div key={ex.id} className="glass-panel rounded-xl overflow-hidden flex flex-col border border-white/10 hover:border-white/30 transition-colors">
                        {/* Video Preview */}
                        <div className="relative h-48 bg-black/40 group">
                          {ex.videoType === 'upload' && ex.video ? (
                            <>
                              <video 
                                src={ex.video} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                              />
                              <button 
                                onClick={() => setPlayingVideo(ex)}
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform shadow-lg border border-white/30">
                                  <Play className="text-white ml-1" size={28} fill="currentColor" />
                                </div>
                              </button>
                            </>
                          ) : ex.video && getYoutubeId(ex.video) ? (
                            <>
                              <img 
                                src={`https://img.youtube.com/vi/${getYoutubeId(ex.video)}/hqdefault.jpg`} 
                                alt={ex.name}
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                              />
                              <button 
                                onClick={() => setPlayingVideo(ex)}
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform shadow-lg border border-white/30">
                                  <Play className="text-white ml-1" size={28} fill="currentColor" />
                                </div>
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                              <Play size={32} className="mb-2 opacity-50" />
                              <span className="text-sm">Sem vídeo</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-bold text-lg text-white">{ex.name}</h5>
                            <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/90 capitalize border border-white/5">
                              {ex.muscleGroup}
                            </span>
                          </div>
                          <p className="text-white/70 text-sm mb-5 line-clamp-2 flex-1">{ex.description}</p>
                          
                          <div className="flex gap-2 mt-auto">
                            <button onClick={() => setEditingExercise(ex)} className="btn-secondary flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1"><Edit2 size={14}/> Editar</button>
                            <button onClick={async () => {
                              if(confirm('Tem certeza que deseja excluir este exercício?')) {
                                await fetch(`/api/exercises/${ex.id}`, { method: 'DELETE' });
                                setExercises(exercises.filter(e => e.id !== ex.id));
                              }
                            }} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1"><Trash2 size={14}/> Excluir</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {exercises.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button 
                      disabled={exercisePage === 1}
                      onClick={() => setExercisePage(prev => prev - 1)}
                      className="p-2 rounded-lg bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-white font-medium">Página {exercisePage}</span>
                    <button 
                      disabled={exercises.filter(ex => 
                        ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                        ex.muscleGroup.toLowerCase().includes(exerciseSearch.toLowerCase())
                      ).length <= exercisePage * ITEMS_PER_PAGE}
                      onClick={() => setExercisePage(prev => prev + 1)}
                      className="p-2 rounded-lg bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {adminTab === 'students' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                  <h4 className="text-lg sm:text-xl font-bold text-white">Alunos Cadastrados</h4>
                  <button onClick={() => setShowStudentModal(true)} className="btn-primary w-full sm:w-auto px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm sm:text-base">
                    <Plus size={18} /> Novo Aluno
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar aluno por nome ou email..." 
                    className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-sm"
                    value={studentSearch}
                    onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudents.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-white/40">Nenhum aluno encontrado.</div>
                  ) : (
                    filteredStudents.map(student => (
                        <div key={student.id} className="glass-panel p-5 rounded-xl flex justify-between items-center border border-white/10 hover:border-white/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white/20 overflow-hidden flex-shrink-0">
                              {student.photo && student.photo.trim() !== '' ? (
                                <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                student.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <h5 className="font-bold text-lg text-white">{student.name}</h5>
                              <p className="text-white/70 text-sm">{student.email}</p>
                              <p className="text-white/70 text-sm mt-1"><strong className="text-white/90">Objetivo:</strong> <span className="capitalize">{student.objective || 'Não definido'}</span></p>
                            </div>
                          </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => setSelectedStudent(student)} className="btn-secondary px-4 py-2 rounded-lg text-sm">Ver Progresso</button>
                          <button 
                            onClick={async () => {
                              if(confirm(`Tem certeza que deseja excluir o aluno ${student.name}? Todos os seus dados (treinos, logs, plano) serão removidos permanentemente.`)) {
                                await fetch(`/api/users/${student.id}`, { method: 'DELETE' });
                                setUsers(users.filter(u => u.id !== student.id));
                                setWorkoutPlans(workoutPlans.filter(p => p.studentId !== student.id));
                                setCompletedWorkouts(completedWorkouts.filter(w => w.userId !== student.id));
                                setWorkoutLogs(workoutLogs.filter(l => l.userId !== student.id));
                                alert('Aluno e todos os seus dados foram excluídos.');
                              }
                            }}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            Excluir Aluno
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {users.filter(u => u.type === 'aluno').length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button 
                      disabled={studentPage === 1}
                      onClick={() => setStudentPage(prev => prev - 1)}
                      className="p-2 rounded-lg bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-white font-medium">Página {studentPage}</span>
                    <button 
                      disabled={users.filter(u => 
                        u.type === 'aluno' && 
                        (u.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                         u.email.toLowerCase().includes(studentSearch.toLowerCase()))
                      ).length <= studentPage * ITEMS_PER_PAGE}
                      onClick={() => setStudentPage(prev => prev + 1)}
                      className="p-2 rounded-lg bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {adminTab === 'instructors' && currentUser.type === 'admin' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                  <h4 className="text-lg sm:text-xl font-bold text-white">Instrutores Cadastrados</h4>
                  <button onClick={() => setShowInstructorModal(true)} className="btn-primary w-full sm:w-auto px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm sm:text-base">
                    <Plus size={18} /> Novo Instrutor
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar instrutor por nome ou email..." 
                    className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-sm"
                    value={instructorSearch}
                    onChange={(e) => { setInstructorSearch(e.target.value); setInstructorPage(1); }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredInstructors.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-white/40">Nenhum instrutor encontrado.</div>
                  ) : (
                    filteredInstructors.map(instructor => (
                      <div key={instructor.id} className="glass-panel p-5 rounded-xl flex justify-between items-center border border-white/10 hover:border-white/30 transition-colors">
                        <div>
                          <h5 className="font-bold text-lg text-white">{instructor.name}</h5>
                          <p className="text-white/70 text-sm">{instructor.email}</p>
                          {instructor.bio && <p className="text-white/60 text-xs mt-2 line-clamp-2">{instructor.bio}</p>}
                        </div>
                        <button onClick={async () => {
                          if (confirm('Remover este instrutor?')) {
                            await fetch(`/api/users/${instructor.id}`, { method: 'DELETE' });
                            setUsers(users.filter(u => u.id !== instructor.id));
                          }
                        }} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors px-4 py-2 rounded-lg text-sm">Remover</button>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination */}
                {users.filter(u => u.type === 'instrutor').length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button 
                      disabled={instructorPage === 1}
                      onClick={() => setInstructorPage(prev => prev - 1)}
                      className="p-2 rounded-lg bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-white font-medium">Página {instructorPage}</span>
                    <button 
                      disabled={users.filter(u => 
                        u.type === 'instrutor' && 
                        (u.name.toLowerCase().includes(instructorSearch.toLowerCase()) || 
                         u.email.toLowerCase().includes(instructorSearch.toLowerCase()))
                      ).length <= instructorPage * ITEMS_PER_PAGE}
                      onClick={() => setInstructorPage(prev => prev + 1)}
                      className="p-2 rounded-lg bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddExerciseToPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[25px] w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddExerciseToPlanModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
              <X size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-white">Adicionar Exercício ao Plano</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/workout-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: parseInt(selectedStudentForPlan),
                  dayIndex: selectedDayForPlan,
                  exerciseId: parseInt(newPlanExercise.exerciseId),
                  targetReps: newPlanExercise.targetReps,
                  targetWeight: newPlanExercise.targetWeight
                })
              });
              if (res.ok) {
                const newPlan = await res.json();
                setWorkoutPlans([...workoutPlans, newPlan]);
                setShowAddExerciseToPlanModal(false);
                setNewPlanExercise({ exerciseId: '', targetReps: '', targetWeight: '' });
              }
            }} className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-1">Exercício:</label>
                <select required value={newPlanExercise.exerciseId} onChange={e => setNewPlanExercise({...newPlanExercise, exerciseId: e.target.value})} className="glass-input w-full p-3 rounded-xl">
                  <option value="" className="text-black">Selecione um exercício...</option>
                  {[...exercises].sort((a, b) => a.name.localeCompare(b.name)).map(ex => (
                    <option key={ex.id} value={ex.id} className="text-black">{ex.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Meta de Repetições (opcional):</label>
                <input type="text" value={newPlanExercise.targetReps} onChange={e => setNewPlanExercise({...newPlanExercise, targetReps: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Ex: 3x12" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Meta de Carga (kg) (opcional):</label>
                <input type="text" value={newPlanExercise.targetWeight} onChange={e => setNewPlanExercise({...newPlanExercise, targetWeight: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Ex: 20" />
              </div>
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-bold text-lg mt-4">Adicionar ao Plano</button>
            </form>
          </div>
        </div>
      )}

      {showExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[25px] w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowExerciseModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
              <X size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-white">Novo Exercício</h2>
            <form onSubmit={handleAddExercise} className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-1">Nome:</label>
                <input type="text" required value={newExercise.name} onChange={e => setNewExercise({...newExercise, name: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Ex: Supino Reto" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Grupo Muscular:</label>
                <select required value={newExercise.muscleGroup} onChange={e => setNewExercise({...newExercise, muscleGroup: e.target.value})} className="glass-input w-full p-3 rounded-xl">
                  <option value="" className="text-black">Selecione...</option>
                  <option value="peito" className="text-black">Peito</option>
                  <option value="costas" className="text-black">Costas</option>
                  <option value="pernas" className="text-black">Pernas</option>
                  <option value="ombros" className="text-black">Ombros</option>
                  <option value="biceps" className="text-black">Bíceps</option>
                  <option value="triceps" className="text-black">Tríceps</option>
                  <option value="abdomen" className="text-black">Abdômen</option>
                  <option value="cardio" className="text-black">Cardio</option>
                </select>
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Descrição:</label>
                <textarea required value={newExercise.description} onChange={e => setNewExercise({...newExercise, description: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Descrição do exercício..." rows={3}></textarea>
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Tipo de Vídeo:</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 text-white">
                    <input type="radio" name="videoType" value="url" checked={newExercise.videoType === 'url'} onChange={() => setNewExercise({...newExercise, videoType: 'url'})} />
                    Link do YouTube
                  </label>
                  <label className="flex items-center gap-2 text-white">
                    <input type="radio" name="videoType" value="upload" checked={newExercise.videoType === 'upload'} onChange={() => setNewExercise({...newExercise, videoType: 'upload'})} />
                    Enviar Arquivo
                  </label>
                </div>
                {newExercise.videoType === 'url' ? (
                  <input type="url" value={newExercise.videoUrl} onChange={e => setNewExercise({...newExercise, videoUrl: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="https://youtube.com/watch?v=..." />
                ) : (
                  <input type="file" accept="video/*" onChange={e => setNewExerciseFile(e.target.files?.[0] || null)} className="glass-input w-full p-3 rounded-xl text-white" />
                )}
              </div>
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-bold text-lg mt-4">Salvar Exercício</button>
            </form>
          </div>
        </div>
      )}

      {editingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[25px] w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditingExercise(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
              <X size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-white">Editar Exercício</h2>
            <form onSubmit={handleUpdateExercise} className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-1">Nome:</label>
                <input type="text" required value={editingExercise.name} onChange={e => setEditingExercise({...editingExercise, name: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Ex: Supino Reto" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Grupo Muscular:</label>
                <select required value={editingExercise.muscleGroup} onChange={e => setEditingExercise({...editingExercise, muscleGroup: e.target.value})} className="glass-input w-full p-3 rounded-xl">
                  <option value="" className="text-black">Selecione...</option>
                  <option value="peito" className="text-black">Peito</option>
                  <option value="costas" className="text-black">Costas</option>
                  <option value="pernas" className="text-black">Pernas</option>
                  <option value="ombros" className="text-black">Ombros</option>
                  <option value="biceps" className="text-black">Bíceps</option>
                  <option value="triceps" className="text-black">Tríceps</option>
                  <option value="abdomen" className="text-black">Abdômen</option>
                  <option value="cardio" className="text-black">Cardio</option>
                </select>
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Descrição:</label>
                <textarea required value={editingExercise.description} onChange={e => setEditingExercise({...editingExercise, description: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Descrição do exercício..." rows={3}></textarea>
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Tipo de Vídeo:</label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2 text-white">
                    <input type="radio" name="editVideoType" value="url" checked={editingExercise.videoType === 'url'} onChange={() => setEditingExercise({...editingExercise, videoType: 'url'})} />
                    Link do YouTube
                  </label>
                  <label className="flex items-center gap-2 text-white">
                    <input type="radio" name="editVideoType" value="upload" checked={editingExercise.videoType === 'upload'} onChange={() => setEditingExercise({...editingExercise, videoType: 'upload'})} />
                    Enviar Arquivo
                  </label>
                </div>
                {editingExercise.videoType === 'url' ? (
                  <input type="url" value={editingExercise.videoUrl !== undefined ? editingExercise.videoUrl : editingExercise.video || ''} onChange={e => setEditingExercise({...editingExercise, videoUrl: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="https://youtube.com/watch?v=..." />
                ) : (
                  <div className="space-y-2">
                    {editingExercise.video && !editingExerciseFile && (
                      <p className="text-white/70 text-sm">Arquivo atual: {editingExercise.video.split('/').pop()}</p>
                    )}
                    <input type="file" accept="video/*" onChange={e => setEditingExerciseFile(e.target.files?.[0] || null)} className="glass-input w-full p-3 rounded-xl text-white" />
                  </div>
                )}
              </div>
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-bold text-lg mt-4">Atualizar Exercício</button>
            </form>
          </div>
        </div>
      )}

      {showInstructorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[25px] w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowInstructorModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
              <X size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-white">Novo Instrutor</h2>
            <form onSubmit={handleAddInstructor} className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-1">Nome:</label>
                <input type="text" required value={newInstructor.name} onChange={e => setNewInstructor({...newInstructor, name: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Nome do instrutor" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Email:</label>
                <input type="email" required value={newInstructor.email} onChange={e => setNewInstructor({...newInstructor, email: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Senha:</label>
                <input type="password" required value={newInstructor.password} onChange={e => setNewInstructor({...newInstructor, password: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Senha de acesso" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Biografia (Opcional):</label>
                <textarea value={newInstructor.bio} onChange={e => setNewInstructor({...newInstructor, bio: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Breve descrição sobre o instrutor..." rows={3}></textarea>
              </div>
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-bold text-lg mt-4">Salvar Instrutor</button>
            </form>
          </div>
        </div>
      )}

      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[25px] w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowStudentModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
              <X size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 text-white">Novo Aluno</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-1">Nome:</label>
                <input type="text" required value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Nome do aluno" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Email:</label>
                <input type="email" required value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Senha:</label>
                <input type="password" required value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} className="glass-input w-full p-3 rounded-xl" placeholder="Senha de acesso" />
              </div>
              <div>
                <label className="block text-white font-semibold mb-1">Objetivo:</label>
                <select required value={newStudent.objective} onChange={e => setNewStudent({...newStudent, objective: e.target.value})} className="glass-input w-full p-3 rounded-xl text-black">
                  <option value="hipertrofia">Hipertrofia</option>
                  <option value="emagrecimento">Emagrecimento</option>
                  <option value="forca">Força</option>
                  <option value="resistencia">Resistência</option>
                  <option value="saude">Saúde e Bem-estar</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full py-3 rounded-xl font-bold text-lg mt-4">Salvar Aluno</button>
            </form>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[25px] w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all">
              <X size={24} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold border-2 border-white/20 overflow-hidden">
                {selectedStudent.photo && selectedStudent.photo.trim() !== '' ? (
                  <img src={selectedStudent.photo} alt={selectedStudent.name} className="w-full h-full object-cover" />
                ) : (
                  selectedStudent.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Progresso de {selectedStudent.name}</h2>
                <p className="text-white/70 capitalize">Objetivo: {selectedStudent.objective || 'Não definido'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="glass-panel p-4 rounded-xl text-center">
                <div className="text-3xl font-black text-gradient mb-1">{completedWorkouts.filter(w => w.userId === selectedStudent.id).length}</div>
                <div className="text-white/80 text-xs font-medium uppercase tracking-wider">Treinos Concluídos</div>
              </div>
              <div className="glass-panel p-4 rounded-xl text-center">
                <div className="text-3xl font-black text-gradient mb-1">{workoutLogs.filter(w => w.userId === selectedStudent.id).length}</div>
                <div className="text-white/80 text-xs font-medium uppercase tracking-wider">Exercícios Registrados</div>
              </div>
            </div>

            <h4 className="text-lg font-bold text-white mb-4">Treinos Concluídos</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 mb-8">
              {completedWorkouts.filter(w => w.userId === selectedStudent.id).length === 0 ? (
                <p className="text-white/50 text-center py-4">Nenhum treino concluído.</p>
              ) : (
                completedWorkouts.filter(w => w.userId === selectedStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(w => (
                  <div key={w.id} className="bg-white/5 p-4 rounded-lg border border-white/10 flex justify-between items-center">
                    <div>
                      <h5 className="font-bold text-white">{['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][w.dayIndex]}</h5>
                      <p className="text-white/50 text-xs">{new Date(w.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                    </div>
                    <button 
                      onClick={async () => {
                        if(confirm('Excluir este registro de treino concluído?')) {
                          await fetch(`/api/completed-workouts/${w.id}`, { method: 'DELETE' });
                          setCompletedWorkouts(completedWorkouts.filter(cw => cw.id !== w.id));
                        }
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Excluir registro"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <h4 className="text-lg font-bold text-white mb-4">Histórico de Exercícios</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {workoutLogs.filter(log => log.userId === selectedStudent.id).length === 0 ? (
                <p className="text-white/50 text-center py-4">Nenhum exercício registrado.</p>
              ) : (
                workoutLogs.filter(log => log.userId === selectedStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                  <div key={log.id} className="bg-white/5 p-4 rounded-lg border border-white/10 flex justify-between items-center">
                    <div>
                      <h5 className="font-bold text-white">{log.exerciseName}</h5>
                      <p className="text-white/50 text-xs">{new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex gap-4 text-right items-center">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] text-white/50 uppercase tracking-wider">Repetições</p>
                          <p className="font-bold text-white">{log.reps}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/50 uppercase tracking-wider">Carga</p>
                          <p className="font-bold text-white">{log.weight} kg</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          if(confirm('Excluir este registro de exercício?')) {
                            await fetch(`/api/workout-logs/${log.id}`, { method: 'DELETE' });
                            setWorkoutLogs(workoutLogs.filter(l => l.id !== log.id));
                          }
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors ml-2"
                        title="Excluir registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8">
          <div className="w-full max-w-5xl relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <button 
              onClick={() => setPlayingVideo(null)} 
              className="absolute top-4 right-4 z-10 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
            >
              <X size={24} />
            </button>
            {playingVideo.videoType === 'upload' ? (
              <video 
                src={playingVideo.video} 
                className="w-full h-full" 
                controls 
                autoPlay
              ></video>
            ) : (
              <iframe 
                src={`${playingVideo.video}?autoplay=1`} 
                className="w-full h-full" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
