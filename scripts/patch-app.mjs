import fs from 'fs';
import path from 'path';

const TYPES_PATH = 'apps/desktop/src/renderer/types.ts';
const typesCode = fs.readFileSync(TYPES_PATH, 'utf-8');
const patchedTypes = typesCode.replace(
  "export type TabType =",
  "export type PersonaTrack = 'learner' | 'seeker';\n\nexport type TabType =\n  | 'learner-roadmaps'\n  | 'learner-resources'\n  | 'learner-interview-prep'"
);
fs.writeFileSync(TYPES_PATH, patchedTypes);

const APP_PATH = 'apps/desktop/src/renderer/App.tsx';
let appCode = fs.readFileSync(APP_PATH, 'utf-8');

if (!appCode.includes("import { LearnerView }")) {
  appCode = appCode.replace(
    "import { HomeView }",
    "import { HomeView } from './components/HomeView';\nimport { LearnerView } from './components/LearnerView';\nimport { UpgradeModal } from './components/UpgradeModal';\nimport { PersonaTrack }"
  );
}

if (!appCode.includes("const [activeTrack")) {
  appCode = appCode.replace(
    "const [activeTab, setActiveTab] = useState<TabType>",
    "const [activeTrack, setActiveTrack] = useState<PersonaTrack>('learner');\n  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);\n  const [upgradeFeature, setUpgradeFeature] = useState<string>('');\n\n  const [activeTab, setActiveTab] = useState<TabType>"
  );
}

appCode = appCode.replace(
  "<TopBar\n        currentUser={currentUser}\n        onLogout={handleLogout}\n        activeTab={activeTab}\n        onNavigate={setActiveTab}\n      />",
  `<TopBar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onNavigate={setActiveTab}
        activeTrack={activeTrack}
        setTrack={setActiveTrack}
      />`
);

appCode = appCode.replace(
  "<Sidebar\n          activeTab={activeTab}",
  "<Sidebar\n          activeTrack={activeTrack}\n          activeTab={activeTab}"
);

if (!appCode.includes("<LearnerView")) {
  appCode = appCode.replace(
    '<div className="max-w-6xl mx-auto">',
    `<div className="max-w-6xl mx-auto">
            {activeTab.startsWith('learner') && (
              <LearnerView profile={profile} onUpdateProfile={(u) => setProfile({ ...profile, ...u })} onNavigateToSeeker={() => { setActiveTrack('seeker'); setActiveTab('feed'); }} onLog={addLog} />
            )}`
  );
}

if (!appCode.includes("<UpgradeModal")) {
  appCode = appCode.replace(
    "</main>",
    `</main>
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} currentUser={currentUser} triggerFeature={upgradeFeature} onUpgradeSuccess={() => console.log('Upgraded!')} />`
  );
}

fs.writeFileSync(APP_PATH, appCode);

console.log('App and types patched successfully.');
