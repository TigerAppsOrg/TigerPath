import introJs from 'intro.js';
import 'intro.js/introjs.css';

// Same tour as the classic legacy/tutorial.js, updated for the new layout.
const STEPS = [
  {
    intro:
      'Welcome to TigerPath! We\'ll take you on a brief tour to show you how to use the app. Click "Next" to begin.',
  },
  {
    element: '#search-pane',
    intro: `Search for courses by course code or title here. Try searching something now!
      <br><br>Drag a result into any semester, or click it to see ratings, comments, and an "Add to semester" menu.`,
  },
  {
    element: '#semesters',
    intro: `This is your four-year plan. Drag courses between semesters to rearrange them; hover a course for details or to remove it.
      <br><br>A column turns red while dragging if the course hasn't been offered in that season before.`,
  },
  {
    element: '#main-view-tabs',
    intro: `Each plan (a "path") has its own major, minors, and courses, so you can compare scenarios.
      Use + to create a path, and the pencil to rename it, change its major or minors, duplicate it, or delete it.`,
  },
  {
    element: '#requirements',
    intro: `Your requirement progress updates automatically as you plan. Click a requirement to find courses that satisfy it or to add an external credit.
      <br><br>Grey courses could count toward more than one requirement; click one to settle it there.`,
  },
  {
    element: '#tp-settings-btn',
    intro: 'Change your class year or color theme in Settings. You can replay this tour from the Tutorial button anytime.',
  },
];

export default function startTutorial() {
  introJs().setOptions({ showStepNumbers: false, steps: STEPS }).start();
}
