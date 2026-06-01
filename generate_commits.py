import os
import subprocess
import random
from datetime import datetime, timedelta

def run_cmd(cmd):
    return subprocess.check_output(cmd, shell=True).decode('utf-8').strip()

# 1. Get all files that need to be committed
output = run_cmd("git ls-files -mo --exclude-standard")
files = [f for f in output.split('\n') if f.strip()]

if not files:
    print("No files to commit.")
    exit(0)

print(f"Found {len(files)} files to commit.")

# 2. Plan the commits
# Target: Last 7 days, 7-10 commits each. Today: 20 commits.
# We will create a list of timestamps for each commit.

commits_plan = []
now = datetime.now()

# For the last 7 days (from 7 days ago up to 1 day ago)
for i in range(7, 0, -1):
    num_commits = random.randint(7, 10)
    day = now - timedelta(days=i)
    
    # Generate random times within the day
    for _ in range(num_commits):
        # random hour between 9 AM and 6 PM
        h = random.randint(9, 17)
        m = random.randint(0, 59)
        s = random.randint(0, 59)
        commit_time = day.replace(hour=h, minute=m, second=s)
        commits_plan.append(commit_time)

# For today, 20 commits
for _ in range(20):
    # random time up to now, let's say between 9 AM and current hour if possible
    # just offset them slightly before now
    offset_minutes = random.randint(1, 400)
    commit_time = now - timedelta(minutes=offset_minutes)
    commits_plan.append(commit_time)

# Sort plan chronologically
commits_plan.sort()

print(f"Planned {len(commits_plan)} commits.")

# 3. Execute commits
# If we have more files than planned commits, we will group the remaining files in the last commit.
# If we have fewer files than planned commits, we will stop early (or we could modify files to generate commits, but hopefully 117 > ~80).

for idx, commit_time in enumerate(commits_plan):
    if not files:
        break
        
    if idx == len(commits_plan) - 1:
        # Last commit, take all remaining files
        batch = files
        files = []
    else:
        # Take 1 file
        batch = [files.pop(0)]
        
    for f in batch:
        run_cmd(f"git add \"{f}\"")
        
    time_str = commit_time.strftime('%Y-%m-%dT%H:%M:%S')
    
    file_names = ", ".join([os.path.basename(f) for f in batch[:2]])
    if len(batch) > 2:
        file_names += f" and {len(batch) - 2} more"
        
    msg = f"Update {file_names}"
    
    # Commit with backdated timestamp
    env = os.environ.copy()
    env['GIT_AUTHOR_DATE'] = time_str
    env['GIT_COMMITTER_DATE'] = time_str
    
    subprocess.run(["git", "commit", "-m", msg], env=env)
    print(f"Committed {len(batch)} files on {time_str}")

print("Done generating commits. You can now push using 'git push'.")
