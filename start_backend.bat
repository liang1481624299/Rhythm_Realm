@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ============================================
echo   Sposobin 和声写作台 V1.3 启动脚本
echo ============================================
echo.

:: 获取脚本所在目录
set "SPOSOBIN_DIR=%~dp0"
set "SPOSOBIN_DIR=%SPOSOBIN_DIR:~0,-1%"

:: 检查 Python 3.11.9
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.11.9
    pause
    exit /b 1
)

:: 检查虚拟环境
if not exist "%SPOSOBIN_DIR%\.venv\Scripts\activate.bat" (
    echo [提示] 未找到虚拟环境，正在创建...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [错误] 虚拟环境创建失败
        pause
        exit /b 1
    )
)

:: 激活虚拟环境
echo [1/4] 激活虚拟环境...
call "%SPOSOBIN_DIR%\.venv\Scripts\activate.bat"

:: 安装后端依赖
echo [2/4] 安装后端依赖...
cd /d "%SPOSOBIN_DIR%"
pip install -q -r requirements.txt
if %errorlevel% neq 0 (
    echo [警告] 依赖安装可能失败，尝试继续...
)

:: 检查前端目录
if exist "%SPOSOBIN_DIR%\frontend\package.json" (
    echo [3/4] 检测到前端目录，请手动运行:
    echo    cd frontend
    echo    npm install
    echo.
) else (
    echo [3/4] 跳过前端依赖安装
)

:: 启动后端
echo [4/4] 启动后端服务...
echo.
echo   后端 API: http://localhost:8000
echo   管理后台: http://localhost:8000/admin
echo.
echo   用户名: admin
echo   密码: SposobinSecure2026
echo.
echo   按 Ctrl+C 停止服务
echo ============================================
echo.

:: 启动服务
cd /d "%SPOSOBIN_DIR%\apps\sposobin"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

endlocal
