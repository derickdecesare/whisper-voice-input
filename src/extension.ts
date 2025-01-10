import * as vscode from "vscode";
import { spawn, exec } from "child_process";
import * as fs from "fs";
import * as path from "path";

let recordingProcess: ReturnType<typeof spawn> | null = null;
let statusBarItem: vscode.StatusBarItem;
let storagePath: string;

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating extension...");

  storagePath = context.globalStorageUri.fsPath;
  console.log("storage path: ", storagePath);

  // Create storage directory if it doesn't exist
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath);
  }

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );
  context.subscriptions.push(statusBarItem);

  let startRecordingCommand = vscode.commands.registerCommand(
    "whisper-voice-input.startRecording",
    () => {
      console.log("Start recording command triggered");
      startRecording();
    }
  );

  let stopRecordingCommand = vscode.commands.registerCommand(
    "whisper-voice-input.stopRecording",
    () => {
      console.log("Stop recording command triggered");
      stopRecording();
    }
  );

  context.subscriptions.push(startRecordingCommand);
  context.subscriptions.push(stopRecordingCommand);
  console.log("Extension activated successfully");
}

async function checkMicrophonePermission(): Promise<boolean> {
  return new Promise((resolve) => {
    const testProcess = spawn("sox", ["-d", "-n", "rec"]);

    testProcess.on("error", (err) => {
      console.error("Microphone permission error:", err);
      vscode.window.showErrorMessage(
        "Microphone access denied. Please grant permission in System Preferences."
      );
      resolve(false);
    });

    setTimeout(() => {
      testProcess.kill();
      resolve(true);
    }, 100);
  });
}

async function startRecording() {
  if (recordingProcess) {
    console.log("Recording already in progress");
    vscode.window.showInformationMessage("Recording already in progress!");
    return;
  }

  console.log("Checking microphone permission...");
  const hasPermission = await checkMicrophonePermission();
  if (!hasPermission) {
    return;
  }

  const recordingPath = path.join(storagePath, "recording.wav");
  console.log("Starting sox recording process...");
  console.log("Recording to path:", recordingPath);

  recordingProcess = spawn("sox", ["-d", recordingPath]);

  recordingProcess.on("error", (err) => {
    console.error("Sox process error:", err);
    vscode.window.showErrorMessage(`Recording error: ${err.message}`);
    recordingProcess = null;
  });

  statusBarItem.text = "$(mic) Recording...";
  statusBarItem.show();
  vscode.window.showInformationMessage(
    "Recording started - use command palette to stop"
  );
}

async function stopRecording() {
  if (!recordingProcess) {
    console.log("No recording process found");
    vscode.window.showInformationMessage("No recording in progress!");
    return;
  }

  console.log("Stopping recording process...");
  recordingProcess.kill();
  statusBarItem.hide();

  // Check storage path is accessible
  try {
    fs.accessSync(storagePath, fs.constants.W_OK);
  } catch (err) {
    console.error("Storage path not accessible:", storagePath);
    vscode.window.showErrorMessage("Cannot access storage directory");
    recordingProcess = null;
    return;
  }

  const recordingPath = path.join(storagePath, "recording.wav");

  // Check if recording file exists
  if (!fs.existsSync(recordingPath)) {
    console.error("Recording file not found at:", recordingPath);
    vscode.window.showErrorMessage("Recording failed - no audio file created");
    recordingProcess = null;
    return;
  }

  try {
    console.log("Starting transcription...");
    vscode.window.showInformationMessage(
      "Stopped recording. Now transcribing..."
    );

    // Transcribe
    await new Promise((resolve, reject) => {
      console.log("Executing whisper command...");
      exec(
        `whisper "${recordingPath}" --model base --language English --output_format txt --output_dir "${storagePath}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error("Whisper error:", error);
            console.error("Whisper stderr:", stderr);
            reject(error);
            return;
          }
          console.log("Whisper stdout:", stdout);
          resolve(stdout);
        }
      );
    });

    // Find the transcription file
    const files = fs.readdirSync(storagePath);
    const transcriptionFile = files.find(
      (file) => file.includes("recording") && file.endsWith(".txt")
    );
    if (!transcriptionFile) {
      throw new Error("Could not find transcription output file");
    }
    const transcriptionPath = path.join(storagePath, transcriptionFile);

    // Copy to clipboard
    console.log("Copying to clipboard...");
    await new Promise((resolve, reject) => {
      exec(`pbcopy < "${transcriptionPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error("Pbcopy error:", error);
          console.error("Pbcopy stderr:", stderr);
          reject(error);
          return;
        }
        console.log("Copied to clipboard successfully");
        resolve(stdout);
      });
    });

    console.log("Transcription process completed");
    vscode.window.showInformationMessage("Transcription copied to clipboard!");
    recordingProcess = null;

    // Clean up all related files
    const filesToClean = fs
      .readdirSync(storagePath)
      .filter((file) => file.includes("recording"));
    filesToClean.forEach((file) => {
      try {
        fs.unlinkSync(path.join(storagePath, file));
      } catch (err) {
        console.error(`Error cleaning up ${file}:`, err);
      }
    });
    console.log("Cleaned up temporary files");
  } catch (error) {
    console.error("Error in stopRecording:", error);
    vscode.window.showErrorMessage("Error during transcription: " + error);
    recordingProcess = null;
  }
}

export function deactivate() {
  console.log("Deactivating extension...");
  if (recordingProcess) {
    recordingProcess.kill();
  }
}
