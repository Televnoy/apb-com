<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Судейская Панель</title>
    
    <!-- PWA Настройки -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#ffffff">
    <link rel="manifest" href="manifest.json">
    <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/1088/1088537.png">

    <!-- Подключение шрифтов и Tailwind CSS -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;500&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
        body, html { 
            margin: 0; 
            padding: 0; 
            background: #ffffff; 
            overflow-x: hidden;
            -webkit-tap-highlight-color: transparent;
        }
        
        /* Класс для скрытия прелоадера через opacity (transition в preloader.html) */
        .app-loaded #preloader { 
            opacity: 0 !important; 
            pointer-events: none !important; 
        }
    </style>
</head>
<body>
    <!-- Контейнер для динамической загрузки прелоадера -->
    <div id="preloader-placeholder"></div>

    <!-- Корневой элемент React приложения -->
    <div id="root"></div>

    <script>
        // 1. Загружаем прелоадер из отдельного файла сразу при старте
        fetch('preloader.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('preloader-placeholder').innerHTML = html;
            })
            .catch(err => console.error('Ошибка загрузки прелоадера:', err));

        // 2. Слушаем событие готовности приложения от app.jsx
        window.addEventListener('app-ready', () => {
            // Небольшая задержка, чтобы пользователь успел увидеть анимацию 
            // и чтобы React успел отрисовать первый кадр
            setTimeout(() => {
                document.documentElement.classList.add('app-loaded');
            }, 600);
        });
    </script>

    <!-- Подключение React и Babel для обработки JSX на лету -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <!-- Основной файл приложения -->
    <script type="text/babel" src="app.jsx"></script>

    <!-- Регистрация Service Worker для PWA -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(reg => console.log('Service Worker зарегистрирован'))
                    .catch(err => console.log('Ошибка SW:', err));
            });
        }
    </script>
</body>
</html>
