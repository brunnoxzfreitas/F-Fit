export const initialUsers = [
  {
      id: 1,
      name: "João Silva",
      email: "joao@email.com",
      password: "123456",
      type: "aluno",
      age: 25,
      objective: "hipertrofia"
  },
  {
      id: 2,
      name: "Maria Santos",
      email: "maria@email.com",
      password: "123456",
      type: "instrutor",
      age: 30
  },
  {
      id: 3,
      name: "Administrador F-fit",
      email: "admin@ffit.com",
      password: "admin123",
      type: "admin",
      age: 35,
      role: "Super Administrador",
      permissions: ["all"]
  }
];

export const initialExercises = [
  { 
      id: 1, 
      name: "Supino Reto", 
      muscleGroup: "peito",
      description: "Exercício para desenvolvimento do peitoral superior",
      video: "https://www.youtube.com/embed/0G2_XV7slIg",
      videoType: "url"
  },
  { 
      id: 2, 
      name: "Agachamento", 
      muscleGroup: "pernas",
      description: "Exercício fundamental para quadríceps e glúteos",
      video: "https://www.youtube.com/embed/0tn5K9NlCfo",
      videoType: "url"
  },
  { 
      id: 3, 
      name: "Remada Curvada", 
      muscleGroup: "costas",
      description: "Exercício para fortalecimento dos dorsais",
      video: "https://www.youtube.com/embed/G8l_8chR5BE",
      videoType: "url"
  }
];
