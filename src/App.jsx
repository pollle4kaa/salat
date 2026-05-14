import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Tab, Tabs, Box, AppBar, Toolbar, Typography, ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Компоненты
import ProfileSetup from './components/ProfileSetup';
import FoodDiary from './components/FoodDiary';
import RecipeFinder from './components/RecipeFinder';
import AssistantPanel from './components/AssistantPanel';

// Утилиты
import { parseNutritionCommand } from './utils/voiceParser';
import { foodDatabase } from './utils/foodDatabase';
import {
  calculateNutritionTargets,
  calculateRemaining,
  getRecommendations,
  calculateNutritionForAmount
} from './utils/nutritionCalculator';

// Создаём тему MUI
const theme = createTheme({
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  palette: {
    primary: { main: '#4f46e5' },
    secondary: { main: '#7c3aed' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          padding: '12px 24px'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }
      }
    }
  }
});

function parseAmount(amountStr) {
  if (typeof amountStr === 'number') return amountStr;
  const str = String(amountStr).toLowerCase().trim();
  const num = parseInt(str, 10);
  if (!isNaN(num)) return num;
  const map = {
    'сто': 100, 'двести': 200, 'триста': 300, 'четыреста': 400,
    'пятьсот': 500, 'шестьсот': 600, 'семьсот': 700, 'восемьсот': 800, 'девятьсот': 900,
    'двадцать': 20, 'тридцать': 30, 'сорок': 40, 'пятьдесят': 50,
    'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90,
    'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14,
    'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19,
    'десять': 10, 'один': 1, 'два': 2, 'три': 3, 'четыре': 4, 'пять': 5,
    'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9
  };
  if (map[str]) return map[str];
  const parts = str.split(/[\s-]+/);
  if (parts.length > 1) {
    let total = 0;
    for (let p of parts) { if (map[p]) total += map[p]; else return null; }
    return total;
  }
  return null;
}

function App() {
  const [profile, setProfile] = useState(null);
  const [targets, setTargets] = useState(null);
  const [meals, setMeals] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [totals, setTotals] = useState({ calories: 0, protein: 0, fat: 0, carbs: 0 });
  const [toast, setToast] = useState(null);
  // Состояние для триггера поиска рецептов от ассистента
  const [recipeTrigger, setRecipeTrigger] = useState([]);

  const totalsRef = useRef(totals);
  const targetsRef = useRef(targets);

  useEffect(() => { totalsRef.current = totals; }, [totals]);
  useEffect(() => { targetsRef.current = targets; }, [targets]);

  const token = process.env.REACT_APP_TOKEN;
  const smartappId = process.env.REACT_APP_SMARTAPP;

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Загрузка данных
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('nutrition_profile');
      const savedMeals = localStorage.getItem('nutrition_meals');
      const today = new Date().toISOString().split('T')[0];

      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        setProfile(p);
        setTargets(calculateNutritionTargets(p));
      }

      if (savedMeals) {
        const all = JSON.parse(savedMeals);
        const todayMeals = all.filter(m => m.date === today);
        setMeals(todayMeals);

        const newTotals = todayMeals.reduce((acc, m) => ({
          calories: acc.calories + (m.calories || 0),
          protein: acc.protein + (m.protein || 0),
          fat: acc.fat + (m.fat || 0),
          carbs: acc.carbs + (m.carbs || 0)
        }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

        setTotals(newTotals);
      }
    } catch (e) { console.error('Ошибка загрузки данных:', e); }
  }, []);

  const handleAddFood = useCallback((meal) => {
    setMeals(prev => {
      const newMeals = [...prev, meal];
      const all = JSON.parse(localStorage.getItem('nutrition_meals') || '[]');
      all.push(meal);
      localStorage.setItem('nutrition_meals', JSON.stringify(all));
      return newMeals;
    });
    setTotals(prev => ({
      calories: prev.calories + (meal.calories || 0),
      protein: prev.protein + (meal.protein || 0),
      fat: prev.fat + (meal.fat || 0),
      carbs: prev.carbs + (meal.carbs || 0)
    }));
    showToast(`✅ Добавлено: ${meal.productName} (${meal.calories} ккал)`);
  }, [showToast]);

  const handleDeleteFood = useCallback((id) => {
    setMeals(prev => {
      const newMeals = prev.filter(m => m.id !== id);
      const all = JSON.parse(localStorage.getItem('nutrition_meals') || '[]');
      localStorage.setItem('nutrition_meals', JSON.stringify(all.filter(m => m.id !== id)));
      return newMeals;
    });
    setTotals(prev => ({
      calories: prev.calories - (meals.find(m => m.id === id)?.calories || 0),
      protein: prev.protein - (meals.find(m => m.id === id)?.protein || 0),
      fat: prev.fat - (meals.find(m => m.id === id)?.fat || 0),
      carbs: prev.carbs - (meals.find(m => m.id === id)?.carbs || 0)
    }));
    showToast('🗑️ Удалено');
  }, [showToast, meals]);

  const handleSaveProfile = (newProfile) => {
    setProfile(newProfile);
    const t = calculateNutritionTargets(newProfile);
    setTargets(t);
    localStorage.setItem('nutrition_profile', JSON.stringify(newProfile));
    localStorage.setItem('nutrition_targets', JSON.stringify(t));
    showToast('✅ Профиль сохранён!');
  };

  const handleBackendAction = useCallback((action) => {
    console.log('🎯 Backend action:', action);
    if (!action?.action_id) return;

    switch (action.action_id) {
      case 'add_food': {
        const { productName, amount: amountRaw } = action.parameters || {};
        if (!productName) return;
        let amount = parseAmount(amountRaw);
        if (!amount || amount <= 0) amount = 100;

        const normalize = (s) => {
          let res = s.toLowerCase().trim();
          if (res.endsWith('ы') || res.endsWith('и') || res.endsWith('а') || res.endsWith('я')) res = res.slice(0, -1);
          if (res === 'яйц') res = 'яйцо';
          if (res === 'творога') res = 'творог';
          if (res === 'гречк') res = 'гречка';
          if (res === 'куриц') res = 'курица';
          if (res === 'банана') res = 'банан';
          return res;
        };

        const normalized = normalize(productName);
        const found = foodDatabase.find(food => {
          const dbName = food.name.toLowerCase();
          return dbName === normalized || dbName === productName.toLowerCase() || dbName.includes(normalized);
        });

        if (found) {
          const nutrition = calculateNutritionForAmount(found, amount);
          handleAddFood({
            id: Date.now().toString(),
            productName: found.name,
            amount,
            ...nutrition,
            date: new Date().toISOString().split('T')[0],
            timestamp: Date.now()
          });
        } else {
          showToast(`❌ Не нашёл "${productName}" в базе`);
        }
        break;
      }
      case 'add_custom_food': {
        const { productName, amount, customCalories } = action.parameters || {};
        if (!productName) return;
        handleAddFood({
          id: Date.now().toString(),
          productName,
          amount: parseInt(amount) || 100,
          calories: parseInt(customCalories) || 0,
          protein: 0, fat: 0, carbs: 0,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        });
        break;
      }
      case 'delete_last_food': {
        setMeals(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const newMeals = prev.filter(m => m.id !== last.id);
          const all = JSON.parse(localStorage.getItem('nutrition_meals') || '[]');
          localStorage.setItem('nutrition_meals', JSON.stringify(all.filter(m => m.id !== last.id)));
          return newMeals;
        });
        showToast('🗑️ Удалено последнее');
        break;
      }
      case 'get_progress':
        setCurrentTab(0);
        const progressMsg = `📊 Сегодня: ${totalsRef.current.calories} ккал | Б:${totalsRef.current.protein}г Ж:${totalsRef.current.fat}г У:${totalsRef.current.carbs}г`;
        showToast(progressMsg);
        break;
      case 'get_recommendations':
        setCurrentTab(0);
        if (!targetsRef.current) {
          showToast('⚠️ Сначала настройте профиль!');
          break;
        }
        const remaining = calculateRemaining(targetsRef.current, totalsRef.current);
        const recs = getRecommendations(remaining);
        const recText = recs.length > 0
          ? `💡 Рекомендую: ${recs.map(r => r.items.join(', ')).join('; ')}`
          : '✨ Всё в норме! Продолжайте в том же духе.';
        showToast(recText);
        break;
      case 'search_recipes': {
        const ingredients = action.parameters?.ingredients || [];
        console.log('🔍 Поиск рецептов для:', ingredients);
        setRecipeTrigger(ingredients); // Передаем ингредиенты в RecipeFinder
        setCurrentTab(1);
        showToast('🔍 Ищу рецепты...');
        break;
      }
      default: break;
    }
  }, [handleAddFood, showToast]);

  const handleAssistantCommand = (text) => {
    const context = {
      totals: totalsRef.current,
      remaining: targetsRef.current ? calculateRemaining(targetsRef.current, totalsRef.current) : {},
      recommendations: targetsRef.current ? getRecommendations(calculateRemaining(targetsRef.current, totalsRef.current)) : []
    };
    return parseNutritionCommand(text, {
      addFood: () => "✅ Отправлено ассистенту",
      deleteLastFood: () => "✅ Отправлено ассистенту",
      searchRecipes: () => "✅ Отправлено ассистенту",
      ...context
    });
  };

  if (!profile || !targets) {
    return <ProfileSetup onSave={handleSaveProfile} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, pb: 8 }}>
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>🥗 Ассистент по питанию</Typography>
            <Typography variant="body2" sx={{ bgcolor: 'rgba(255,255,255,0.15)', px: 2, py: 0.5, borderRadius: 2 }}>
              Цель: {targets.calories} ккал
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl">
          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mt: 2 }} variant="scrollable" scrollButtons="auto">
            <Tab label="📋 Дневник" />
            <Tab label="🍳 Рецепты" />
            <Tab label="⚙️ Профиль" />
          </Tabs>

          {currentTab === 0 && <FoodDiary targets={targets} totals={totals} onAddFood={handleAddFood} onDeleteFood={handleDeleteFood} meals={meals} />}
          {/* Передаем triggerSearch в RecipeFinder */}
          {currentTab === 1 && <RecipeFinder triggerSearch={recipeTrigger} />}
          {currentTab === 2 && <Container maxWidth="sm" sx={{ mt: 4 }}><ProfileSetup onSave={handleSaveProfile} initialProfile={profile} /></Container>}
        </Container>

        {toast && (
              <Box
                className="toast"
                sx={{
                  position: 'fixed',
                  bottom: '250px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#000000',
                  color: 'white',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  zIndex: 99999,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  border: '2px solid #4f46e5',
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                  textAlign: 'center'
                }}
              >
                {toast}
              </Box>
            )}

        {token && smartappId && (
          <AssistantPanel
            onCommand={handleAssistantCommand}
            onBackendAction={handleBackendAction}
            token={token}
            smartappId={smartappId}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;