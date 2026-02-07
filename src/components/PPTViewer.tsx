import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  FileText, X, Download, ZoomIn, ZoomOut
} from "lucide-react";

interface PPTViewerProps {
  pptFile: string;       // base64 data URI
  pptFileName: string;
  pptFileType?: string;
  trigger?: React.ReactNode;
}

export default function PPTViewer({ pptFile, pptFileName, pptFileType, trigger }: PPTViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);

  const isPdf = pptFileType?.includes("pdf") || pptFileName.toLowerCase().endsWith(".pdf");

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pptFile;
    link.download = pptFileName;
    link.click();
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
      <FileText className="h-4 w-4" />
      View PPT
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent
        className={`${
          isFullscreen
            ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none p-0"
            : "max-w-4xl w-full h-[85vh]"
        } bg-slate-950 border-white/10 flex flex-col p-0 gap-0`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-purple-400" />
            <div>
              <DialogTitle className="text-sm font-medium text-white">{pptFileName}</DialogTitle>
              <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30 mt-0.5">
                {isPdf ? "PDF" : "Presentation"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-slate-400 w-12 text-center">{zoom}%</span>
            <Button
              variant="ghost" size="icon"
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Button
              variant="ghost" size="icon"
              onClick={handleDownload}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Content viewer */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900/50 p-4">
          {isPdf ? (
            <iframe
              src={pptFile}
              className="w-full h-full rounded-lg border border-white/5"
              title={pptFileName}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
            />
          ) : (
            <div className="text-center space-y-6 max-w-lg">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
                <FileText className="h-10 w-10 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{pptFileName}</h3>
                <p className="text-sm text-slate-400 mb-4">
                  PowerPoint files can be downloaded for viewing in your preferred presentation software.
                </p>
              </div>
              <Button
                onClick={handleDownload}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
              >
                <Download className="h-4 w-4 mr-2" /> Download Presentation
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
