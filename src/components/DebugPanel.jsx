import React, { useState } from 'react';
import { X, Send, AlertCircle, Search } from 'lucide-react';

export default function DebugPanel({ isOpen, onClose }) {
  const [selectedElement, setSelectedElement] = useState(null);
  const [logs, setLogs] = useState([]);
  const [elementPath, setElementPath] = useState('');

  // Функция для выбора элемента на странице
  const selectElement = () => {
    const elements = document.querySelectorAll('*');
    let currentIndex = 0;
    
    const highlightElement = (index) => {
      elements.forEach(el => el.style.outline = '');
      if (elements[index]) {
        elements[index].style.outline = '2px solid red';
        const element = elements[index];
        const rect = element.getBoundingClientRect();
        
        setSelectedElement({
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          textContent: element.textContent?.substring(0, 100),
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          attributes: Array.from(element.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
          }))
        });
        
        setElementPath getElementPath(element));
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        currentIndex = (currentIndex + 1) % elements.length;
        highlightElement(currentIndex);
      } else if (e.key === 'ArrowLeft') {
        currentIndex = (currentIndex - 1 + elements.length) % elements.length;
        highlightElement(currentIndex);
      } else if (e.key === 'Enter') {
        document.removeEventListener('keydown', handleKeyDown);
        elements.forEach(el => el.style.outline = '');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    highlightElement(0);
    
    addLog('Элементы загружены. Используйте ← → для навигации, Enter для выбора', 'info');
  };

  // Получить путь к элементу
  const getElementPath = (element) => {
    if (!element) return '';
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
        path.unshift(selector);
        break;
      } else {
        let sibling = element;
        let nth = 1;
        while (sibling = sibling.previousElementSibling) {
          if (sibling.nodeName.toLowerCase() == selector)
            nth++;
        }
        if (nth != 1)
          selector += ':nth-of-type(' + nth + ')';
      }
      path.unshift(selector);
      element = element.parentNode;
    }
    return path.join(' > ');
  };

  // Отправить элемент
  const sendElement = () => {
    if (selectedElement) {
      addLog('Элемент отправлен: ' + JSON.stringify(selectedElement, null, 2), 'success');
      console.log('Отправленный элемент:', selectedElement);
    } else {
      addLog('Сначала выберите элемент', 'error');
    }
  };

  // Отправить ошибки
  const sendErrors = () => {
    const errors = [];
    if (window.console && console.error) {
      // Получаем ошибки из консоли
      const originalError = console.error;
      console.error = function(...args) {
        errors.push(args.join(' '));
        originalError.apply(console, args);
      };
    }
    
    if (errors.length > 0) {
      addLog('Отправлено ошибок: ' + errors.length, 'warning');
      console.log('Ошибки:', errors);
    } else {
      addLog('Ошибок не найдено', 'info');
    }
  };

  // Добавить лог
  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  // Очистить логи
  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      {/* Заголовок */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-900">Debug Panel</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
          <X size={16} />
        </button>
      </div>

      {/* Кнопки управления */}
      <div className="p-3 border-b space-y-2">
        <div className="flex gap-2">
          <button
            onClick={selectElement}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <Search size={14} />
            Select Element
          </button>
          <button
            onClick={sendElement}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            <Send size={14} />
            Send Element
          </button>
        </div>
        <button
          onClick={sendErrors}
          className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          <AlertCircle size={14} />
          Send Errors
        </button>
      </div>

      {/* Информация о выбранном элементе */}
      {selectedElement && (
        <div className="p-3 border-b bg-gray-50">
          <h4 className="font-medium text-sm mb-2">Выбранный элемент:</h4>
          <div className="text-xs space-y-1">
            <div><strong>Tag:</strong> {selectedElement.tagName}</div>
            <div><strong>Class:</strong> {selectedElement.className || '—'}</div>
            <div><strong>ID:</strong> {selectedElement.id || '—'}</div>
            <div><strong>Text:</strong> {selectedElement.textContent || '—'}</div>
            <div><strong>Path:</strong> {elementPath}</div>
          </div>
        </div>
      )}

      {/* Логи */}
      <div className="p-3 max-h-48 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Логи:</h4>
          <button onClick={clearLogs} className="text-xs text-gray-500 hover:text-gray-700">
            Очистить
          </button>
        </div>
        <div className="space-y-1">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`text-xs p-2 rounded ${
                log.type === 'error' ? 'bg-red-100 text-red-700' :
                log.type === 'success' ? 'bg-green-100 text-green-700' :
                log.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
