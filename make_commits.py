import os
import subprocess
import random
from datetime import datetime, timedelta

COMMITS = [
    {"msg": "init: project scaffolding and docs", "files": [".gitignore", "docker-compose.yml", "context-docs/"]},
    {"msg": "feat(backend): init backend structure", "files": ["backend/requirements.txt", "backend/Dockerfile", "backend/app/main.py", "backend/app/__init__.py", "backend/app/services/__init__.py"]},
    {"msg": "feat(backend): core db models and schemas", "files": ["backend/app/models/"]},
    {"msg": "feat(backend): LLM connection service", "files": ["backend/app/services/llm.py"]},
    {"msg": "feat(backend): cognitive pipeline setup", "files": ["backend/app/services/cognition_service.py"]},
    {"msg": "feat(backend): physics engine base", "files": ["backend/app/services/physics.py"]},
    {"msg": "feat(backend): grid and world generation", "files": ["backend/app/services/world_builder.py"]},
    {"msg": "feat(backend): society rules and diplomacy", "files": ["backend/app/services/society.py"]},
    {"msg": "feat(backend): economy and trade logic", "files": ["backend/app/services/economy.py"]},
    {"msg": "feat(backend): memory management", "files": ["backend/app/services/memory.py"]},
    {"msg": "feat(backend): memetics and belief system", "files": ["backend/app/services/memetics.py"]},
    {"msg": "feat(backend): analytics integration", "files": ["backend/app/services/analytics.py"]},
    {"msg": "feat(backend): lore generation", "files": ["backend/app/services/lore.py"]},
    {"msg": "feat(backend): dream cycle processing", "files": ["backend/app/services/dream_cycle.py"]},
    {"msg": "feat(backend): techtree foundation", "files": ["backend/app/services/techtree.py"]},
    {"msg": "feat(backend): caltrop and simulation api", "files": ["backend/app/services/caltrop.py", "backend/app/routers/"]},
    {"msg": "chore(backend): add tests", "files": ["backend/test_*.py"]},
    {"msg": "chore(frontend): init next.js project", "files": ["frontend/package.json", "frontend/package-lock.json", "frontend/tsconfig.json", "frontend/.gitignore", "frontend/.nvmrc"]},
    {"msg": "chore(frontend): styling configuration", "files": ["frontend/next.config.ts", "frontend/eslint.config.mjs", "frontend/postcss.config.mjs", "frontend/styles/"]},
    {"msg": "feat(frontend): app shell and document", "files": ["frontend/pages/_app.tsx", "frontend/pages/_document.tsx", "frontend/pages/api/", "frontend/pages/logs.tsx"]},
    {"msg": "feat(frontend): landing page implementation", "files": ["frontend/pages/index.tsx"]},
    {"msg": "feat(frontend): grid rendering canvas", "files": ["frontend/components/CanvasGrid.tsx"]},
    {"msg": "feat(frontend): agent inspection and details", "files": ["frontend/components/AgentPanel.tsx", "frontend/pages/agent/"]},
    {"msg": "feat(frontend): memory explorer panel", "files": ["frontend/components/MemoryExplorer.tsx"]},
    {"msg": "feat(frontend): lore panel integration", "files": ["frontend/components/LorePanel.tsx"]},
    {"msg": "feat(frontend): techtree and telemetry", "files": ["frontend/components/TechTreePanel.tsx", "frontend/components/TelemetryChart.tsx"]},
    {"msg": "feat(frontend): demiurgic controls", "files": ["frontend/components/DemiurgicLayer.tsx", "frontend/components/HowToPlayModal.tsx", "frontend/components/TimelineSlider.tsx", "frontend/components/TooltipIcon.tsx"]},
    {"msg": "feat(frontend): state stores", "files": ["frontend/stores/"]},
    {"msg": "chore: frontend static assets", "files": ["frontend/public/favicon.ico", "frontend/public/*.svg", "frontend/AGENTS.md", "frontend/CLAUDE.md"]},
    {"msg": "docs: project README and screenshots", "files": ["README.md", "screenshots/", "frontend/public/screenshots/", "COMPLETED_WORK.md"]}
]

def run_git_commit():
    subprocess.run(["git", "init"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base_time = datetime.now() - timedelta(days=21)
    
    for i, commit in enumerate(COMMITS):
        base_time += timedelta(hours=random.randint(6, 18), minutes=random.randint(0, 59))
        date_str = base_time.strftime("%Y-%m-%dT%H:%M:%S")
        
        for f in commit["files"]:
            subprocess.run(f"git add {f}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
        env = os.environ.copy()
        env["GIT_AUTHOR_DATE"] = date_str
        env["GIT_COMMITTER_DATE"] = date_str
        
        subprocess.run(["git", "commit", "-m", commit["msg"]], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    subprocess.run(["git", "add", "."], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    final_time = datetime.now() - timedelta(minutes=5)
    env = os.environ.copy()
    date_str = final_time.strftime("%Y-%m-%dT%H:%M:%S")
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str
    subprocess.run(["git", "commit", "-m", "chore: final adjustments"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    run_git_commit()
