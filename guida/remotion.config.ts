import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
// Le schermate sono nitide e piatte: una qualità altissima gonfierebbe il
// file senza aggiungere niente di visibile.
Config.setJpegQuality(88);
Config.setOverwriteOutput(true);
