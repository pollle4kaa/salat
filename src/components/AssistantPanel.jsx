import React, { useState, useEffect, useRef } from 'react';
import { createAssistant, createSmartappDebugger } from '@salutejs/client';

export default function AssistantPanel({ onCommand, onBackendAction, token, smartappId }) {
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState('');
  const [inputText, setInputText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const assistantRef = useRef(null);

  const onBackendActionRef = useRef(onBackendAction);
  const onCommandRef = useRef(onCommand);

  useEffect(() => { onBackendActionRef.current = onBackendAction; }, [onBackendAction]);
  useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);

  useEffect(() => {
    if (!token) {
      console.error('❌ Нет токена! Проверь .env: REACT_APP_TOKEN');
      setMessage('❌ Нет токена');
      return;
    }

    const getState = () => {
      const profile = JSON.parse(localStorage.getItem('nutrition_profile') || 'null');
      const targets = JSON.parse(localStorage.getItem('nutrition_targets') || 'null');
      const totals = JSON.parse(localStorage.getItem('nutrition_totals') || '{"calories":0,"protein":0,"fat":0,"carbs":0}');
      const allMeals = JSON.parse(localStorage.getItem('nutrition_meals') || '[]');
      const today = new Date().toISOString().split('T')[0];
      const todayMeals = allMeals.filter(meal => meal.date === today);
      const items = todayMeals.map((meal, index) => ({
        number: index + 1,
        id: meal.id,
        title: `${meal.productName} ${meal.amount}г`
      }));
      return {
        profile, targets, totals,
        item_selector: {
          items,
          ignored_words: ['добавь','съел','запиши','удали','сколько','что съесть','помощь']
        }
      };
    };

    const getRecoveryState = () => ({
      profile: JSON.parse(localStorage.getItem('nutrition_profile') || 'null')
    });

    try {
      let assistant;
      if (process.env.NODE_ENV === 'development') {
        assistant = createSmartappDebugger({
          token,
          initPhrase: 'запусти дневник питания',
          getState,
          getRecoveryState,
          nativePanel: {
            defaultText: 'Скажите или напишите команду',
            screenshotMode: false,
            tabIndex: -1
          },
          surface: 'COMPANION'
        });
      } else {
        assistant = createAssistant({ getState, getRecoveryState });
      }

      assistant.on('data', (event) => {
        console.log('📨 assistant.on(data):', event);
        if (event.type === 'smart_app_data' && event.action) {
          if (onBackendActionRef.current) {
            onBackendActionRef.current(event.action);
          }
        } else if (event.type === 'smart_app_data' && event.smart_app_data?.text) {
          setMessage(event.smart_app_data.text);
          setTimeout(() => setMessage(''), 3000);
        }
      });

      assistant.on('start', (event) => {
        console.log('✅ Ассистент запущен!', event);
        setIsInitialized(true);
        setMessage('Готов к работе');
        setTimeout(() => setMessage(''), 2000);
      });

      assistant.on('error', (error) => {
        console.error('💥 Ошибка ассистента:', error);
        setMessage('Ошибка подключения');
      });

      assistant.on('tts', ({ state, owner }) => {
        if (owner) setIsListening(state === 'start');
      });

      assistantRef.current = assistant;
      if (assistant.start) assistant.start();

      return () => {
        if (assistant.close) assistant.close();
        assistantRef.current = null;
        setIsInitialized(false);
      };
    } catch (err) {
      console.error('🔥 Исключение при инициализации:', err);
      setMessage('❌ Не удалось инициализировать');
    }
  }, [token]);

  const sendCommand = (text) => {
    if (!text.trim() || !assistantRef.current || !isInitialized) {
      setMessage('⏳ Ассистент ещё не готов');
      return;
    }

    console.log('📤 Отправка текста:', text);
    setMessage(`Вы: ${text}`);

    if (onCommandRef.current) {
      const response = onCommandRef.current(text);
      if (response) setMessage(response);
    }

    try {
      assistantRef.current.sendData({
        action: { action_id: 'user_text', parameters: { text } }
      });
    } catch (err) {
      console.error('❌ Ошибка sendData:', err);
    }

    setInputText('');
    setTimeout(() => setMessage(''), 2000);
  };

  const toggleListen = () => {
    // Голосовой ввод можно добавить позже
  };

  if (!token) {
    return (
      <div className="assistant-panel" style={{
        padding: 10,
        textAlign: 'center',
        background: '#fff3cd',
        borderRadius: 12,
        margin: 10
      }}>
        🔐 Нет токена
      </div>
    );
  }

  return (
    <div className="assistant-panel">
      {process.env.NODE_ENV !== 'development' && (
        <button
          className={`assistant-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleListen}
          disabled={!isInitialized}
        >
          {isListening ? '🔴' : '🎤'}
        </button>
      )}

      <input
        type="text"
        className="assistant-input"
        placeholder={isInitialized ? "Например: добавь 100г курицы" : "Подключение..."}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendCommand(inputText)}
        disabled={!isInitialized}
      />

      <button
        className="assistant-btn"
        onClick={() => sendCommand(inputText)}
        disabled={!isInitialized || !inputText.trim()}
      >
        ➤
      </button>

      {/* Убрали отображение message здесь, чтобы не дублировать toast */}
    </div>
  );
}