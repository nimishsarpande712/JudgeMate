import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Brain, ChevronDown, MessageCircle, Plus, Pencil, Check, X,
  Sparkles, RefreshCw
} from "lucide-react";
import { generateRecommendations, generateScoreFollowups } from "@/lib/recommendations";
import type { Project } from "@/types";

interface RecommendationEngineProps {
  project: Project;
  scores?: Record<string, number>;
  onQuestionsChange?: (questions: string[]) => void;
}

export default function RecommendationEngine({ project, scores, onQuestionsChange }: RecommendationEngineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const generated = generateRecommendations(project);
    setQuestions(generated);
    onQuestionsChange?.(generated);
  }, [project.id]);

  const handleRegenerate = () => {
    const generated = generateRecommendations(project);

    // Also add score-based follow-ups if scores exist
    if (scores && Object.keys(scores).length > 0) {
      const followups = generateScoreFollowups(project, scores);
      const combined = [...generated, ...followups];
      const unique = [...new Set(combined)].slice(0, 7);
      setQuestions(unique);
      onQuestionsChange?.(unique);
    } else {
      setQuestions(generated);
      onQuestionsChange?.(generated);
    }
  };

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(questions[idx]);
  };

  const handleSaveEdit = (idx: number) => {
    if (editValue.trim()) {
      const updated = [...questions];
      updated[idx] = editValue.trim();
      setQuestions(updated);
      onQuestionsChange?.(updated);
    }
    setEditingIdx(null);
    setEditValue("");
  };

  const handleDelete = (idx: number) => {
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    onQuestionsChange?.(updated);
  };

  const handleAdd = () => {
    if (newQuestion.trim()) {
      const updated = [...questions, newQuestion.trim()];
      setQuestions(updated);
      onQuestionsChange?.(updated);
      setNewQuestion("");
      setShowAdd(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 transition-all hover:bg-blue-500/10 cursor-pointer">
          <div className="flex items-center gap-3">
            <Brain className="h-4 w-4 text-blue-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-300">AI Recommendations</p>
              <p className="text-xs text-slate-500">{questions.length} personalized questions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {project.domain}
            </Badge>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-400" />
              Suggested Questions
            </h4>
            <Button
              variant="ghost" size="sm"
              onClick={(e) => { e.stopPropagation(); handleRegenerate(); }}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs h-7"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
            </Button>
          </div>

          {/* Questions list */}
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div key={idx} className="group relative">
                {editingIdx === idx ? (
                  <div className="flex gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(idx)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(idx)} className="h-8 w-8 text-green-400 hover:bg-green-500/10 shrink-0">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingIdx(null)} className="h-8 w-8 text-slate-400 hover:bg-white/5 shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs font-mono mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-slate-300 flex-1 leading-relaxed">{q}</p>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0 transition-opacity">
                      <button onClick={() => handleEdit(idx)} className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleDelete(idx)} className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add custom question */}
          {showAdd ? (
            <div className="flex gap-2 pt-1">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Type your custom question..."
                className="bg-white/5 border-white/10 text-white text-sm placeholder:text-slate-600"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-500 text-white shrink-0">
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="text-slate-400 shrink-0">
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost" size="sm"
              onClick={() => setShowAdd(true)}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs w-full"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Custom Question
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
