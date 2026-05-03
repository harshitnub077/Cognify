#!/bin/bash

# Set base directory
REPO_DIR="/Users/harshitru/Desktop/Projects/Cognify/feedshift"
cd "$REPO_DIR"

# Helper function for backdated commits
backdated_commit() {
    local date="$1"
    local message="$2"
    shift 2
    local files=("$@")
    
    for file in "${files[@]}"; do
        if [ -e "$file" ]; then
            git add "$file"
        fi
    done
    
    GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -m "$message"
}

# 1. Mar 3: Initial extension skeleton
backdated_commit "2026-03-03 10:00:00" "chore: initialize extension manifest and structure" "extension/manifest.json" "extension/icons/"

# 2. Mar 6: Core content script logic
backdated_commit "2026-03-06 14:20:00" "feat: implement basic YouTube feed interceptor" "extension/src/content.js"

# 3. Mar 9: Popup UI
backdated_commit "2026-03-09 11:30:00" "feat: add extension popup for manual toggle" "extension/src/popup.html" "extension/src/popup.css" "extension/src/popup.js"

# 4. Mar 12: Backend foundation
backdated_commit "2026-03-12 16:45:00" "chore: setup backend express server" "backend/package.json" "backend/src/index.js" "backend/.env.example"

# 5. Mar 15: Classification route
backdated_commit "2026-03-15 09:15:00" "feat: add initial classification route in backend" "backend/src/routes/classify.js"

# 6. Mar 18: Dashboard init
backdated_commit "2026-03-18 13:10:00" "chore: initialize next.js dashboard" "dashboard/package.json" "dashboard/app/layout.tsx" "dashboard/app/page.tsx" "dashboard/next.config.mjs"

# 7. Mar 22: Dashboard UI Components
backdated_commit "2026-03-22 10:00:00" "feat: add core dashboard ui components" "dashboard/components/Navbar.tsx" "dashboard/components/Sidebar.tsx" "dashboard/components/Hero.tsx"

# 8. Mar 25: User Onboarding Flow
backdated_commit "2026-03-25 15:30:00" "feat: implement multi-step onboarding flow" "dashboard/app/onboarding/"

# 9. Mar 28: Extension Onboarding
backdated_commit "2026-03-28 12:00:00" "feat: add onboarding page for extension" "extension/src/onboarding.html" "extension/src/onboarding.js" "extension/src/onboarding.css"

# 10. Apr 1: YouTube Selector Refinement
backdated_commit "2026-04-01 11:00:00" "fix: update selectors for latest youtube layout" "extension/src/content.js"

# 11. Apr 4: AI Classification Logic
backdated_commit "2026-04-04 14:00:00" "feat: implement ai classification service" "backend/src/services/aiClassifier.js"

# 12. Apr 7: Prompt Engineering
backdated_commit "2026-04-07 10:30:00" "feat: refine classification prompt logic" "backend/src/utils/promptBuilder.js"

# 13. Apr 10: Main Dashboard Page
backdated_commit "2026-04-10 16:00:00" "feat: implement main dashboard overview page" "dashboard/app/dashboard/page.tsx" "dashboard/components/StatsGrid.tsx"

# 14. Apr 13: Shared Constants
backdated_commit "2026-04-13 11:20:00" "chore: add shared constants and types" "shared/"

# 15. Apr 16: Supabase Integration
backdated_commit "2026-04-16 15:45:00" "feat: setup supabase schema and clients" "supabase/" "backend/src/services/supabase.js"

# 16. Apr 19: Documentation
backdated_commit "2026-04-19 10:00:00" "docs: update readme and startup guide" "README.md" "STARTUP_GUIDE.md"

# 17. Apr 22: Legal and Policies
backdated_commit "2026-04-22 13:30:00" "docs: add privacy policy and deployment notes" "PRIVACY_POLICY.md" "DEPLOYMENT.md" "privacy_policy.txt" "store_listing.txt"

# 18. Apr 24: Global Styling
backdated_commit "2026-04-24 11:00:00" "style: implement global design system in dashboard" "dashboard/app/globals.css" "dashboard/tailwind.config.ts"

# 19. Apr 26: Extension Stability Fix
backdated_commit "2026-04-26 16:20:00" "fix: resolve extension context invalidated errors" "extension/src/content.js"

# 20. Apr 28: Semantic Classifier Foundation
backdated_commit "2026-04-28 14:00:00" "feat: add foundation for semantic embedding classification" "backend/src/services/semanticClassifier.js"

# 21. May 1: Strict Allowlist Implementation
backdated_commit "2026-05-01 09:30:00" "feat: implement strict allowlist-based filtering" "extension/src/content.js"

# 22. May 2: Analytics Charts
backdated_commit "2026-05-02 11:00:00" "feat: add student progress and focus charts" "dashboard/components/StudentCharts.tsx"

# 23. May 2: Content Diet Visualization
backdated_commit "2026-05-02 15:00:00" "feat: implement content diet pie charts" "dashboard/components/ContentDietChart.tsx"

# 24. May 3: Semantic Integration in Backend
backdated_commit "2026-05-03 10:00:00" "feat: integrate semantic similarity in classify route" "backend/src/routes/classify.js"

# 25. May 3: Final Polishing
backdated_commit "2026-05-03 16:00:00" "chore: final project refinement and documentation" "."

echo "Successfully created 25 backdated commits!"
