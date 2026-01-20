import { useState, useEffect } from 'react';

// Initial data for demonstration
const initialQuestion = {
  text: "Name something people do when they're nervous",
  answers: [
    { label: "Bite nails", metric: 38, metricDescription: "38 people said", revealed: false },
    { label: "Sweat", metric: 25, metricDescription: "25 people said", revealed: false },
    { label: "Pace around", metric: 18, metricDescription: "18 people said", revealed: false },
    { label: "Stutter", metric: 12, metricDescription: "12 people said", revealed: false },
    { label: "Fidget", metric: 7, metricDescription: "7 people said", revealed: false },
  ]
};

const initialTeams = {
  team1: { name: "The Smiths", score: 275, strikes: 0 },
  team2: { name: "Johnson Family", score: 350, strikes: 0 }
};

// Main component - Modern design only
export default function GameplayScreen() {
  const [currentTeam, setCurrentTeam] = useState<'team1' | 'team2'>('team1');
  const [guess, setGuess] = useState('');
  const [teams, setTeams] = useState(initialTeams);
  const [answers, setAnswers] = useState(initialQuestion.answers);
  const [roundOver, setRoundOver] = useState(false);

  // Check if both teams have 3 strikes - reveal remaining answers
  useEffect(() => {
    if (teams.team1.strikes >= 3 && teams.team2.strikes >= 3 && !roundOver) {
      setRoundOver(true);
      // Reveal all unrevealed answers
      setAnswers(prev => prev.map(answer => ({ ...answer, revealed: true })));
    }
  }, [teams.team1.strikes, teams.team2.strikes, roundOver]);

  const handleSubmit = () => {
    if (!guess.trim() || roundOver) return;

    // Check if guess matches any unrevealed answer (case-insensitive)
    const matchIndex = answers.findIndex(
      a => !a.revealed && a.label.toLowerCase().includes(guess.toLowerCase())
    );

    if (matchIndex !== -1) {
      // Correct answer - reveal it and add points
      setAnswers(prev => prev.map((a, i) =>
        i === matchIndex ? { ...a, revealed: true } : a
      ));
      const points = [100, 75, 50, 25, 10][matchIndex];
      setTeams(prev => ({
        ...prev,
        [currentTeam]: {
          ...prev[currentTeam],
          score: prev[currentTeam].score + points
        }
      }));
    } else {
      // Wrong answer - add strike
      setTeams(prev => ({
        ...prev,
        [currentTeam]: {
          ...prev[currentTeam],
          strikes: prev[currentTeam].strikes + 1
        }
      }));
      // Switch teams if current team has 3 strikes and other team doesn't
      if (teams[currentTeam].strikes + 1 >= 3) {
        const otherTeam = currentTeam === 'team1' ? 'team2' : 'team1';
        if (teams[otherTeam].strikes < 3) {
          setCurrentTeam(otherTeam);
        }
      }
    }
    setGuess('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className={`flex-1 p-6 mr-2 rounded-2xl bg-zinc-900 transition-all ${currentTeam === 'team1' ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-lg">{teams.team1.name}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-light text-white">{teams.team1.score}</p>
              <div className="flex gap-2 justify-end mt-2">
                {[0,1,2].map(i => (
                  <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={i < teams.team1.strikes ? "#dc2626" : "#3f3f46"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: i < teams.team1.strikes ? 1 : 0.4 }}>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-2 bg-zinc-800 rounded-full">
          <span className="text-zinc-500 text-sm">Q3 / 5</span>
        </div>

        <div className={`flex-1 p-6 ml-2 rounded-2xl bg-zinc-900 transition-all ${currentTeam === 'team2' ? 'ring-2 ring-green-500 shadow-lg shadow-green-500/20' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-4xl font-light text-white">{teams.team2.score}</p>
              <div className="flex gap-2 mt-2">
                {[0,1,2].map(i => (
                  <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={i < teams.team2.strikes ? "#dc2626" : "#3f3f46"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: i < teams.team2.strikes ? 1 : 0.4 }}>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold text-lg">{teams.team2.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <p className="text-3xl text-white font-bold text-center my-12">{initialQuestion.text}</p>

      {/* Round Over Message */}
      {roundOver && (
        <div className="text-center mb-6">
          <p className="text-xl text-amber-400 font-semibold">Both teams struck out! Here are the answers you missed:</p>
        </div>
      )}

      {/* Answers List - Vertical */}
      <div className="bg-zinc-900 rounded-3xl p-4 mb-8 border border-zinc-800">
        <div className="space-y-3">
          {answers.map((answer, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-4 rounded-xl transition-all duration-500 ${
                answer.revealed
                  ? 'bg-blue-950 ring-2 ring-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  answer.revealed ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-400'
                }`}>
                  {idx + 1}
                </span>
                <span className={`text-lg ${answer.revealed ? 'text-white font-medium' : 'text-zinc-500'}`}>
                  {answer.revealed ? answer.label : '???'}
                </span>
              </div>
              {answer.revealed && (
                <div className="flex items-center gap-2">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#60a5fa" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  <span className="text-2xl font-bold text-blue-400">{[100,75,50,25,10][idx]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className={`bg-zinc-900 rounded-2xl p-2 flex items-center border border-zinc-800 ${roundOver ? 'opacity-50' : ''}`}>
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={roundOver}
          placeholder={roundOver ? 'Round over!' : `${teams[currentTeam].name}'s guess is...`}
          className="flex-1 bg-transparent text-white text-lg px-4 py-3 focus:outline-none placeholder-zinc-600 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={roundOver}
          className="px-6 py-3 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
