using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace ShowUp
{
    static class Program
    {
        private static HttpListener _listener;
        private static Thread _serverThread;
        private static string _webRoot;
        private static string _baseDir;

        [STAThread]
        static void Main()
        {
            try
            {
                _baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string distDir = Path.Combine(_baseDir, "dist");
                string targetUrl = "https://k39139215-gif.github.io/verasett-social-dashboard-preview/";

                if (Directory.Exists(distDir))
                {
                    _webRoot = distDir;
                    int port = 5182;
                    try
                    {
                        _listener = new HttpListener();
                        _listener.Prefixes.Add("http://localhost:" + port + "/");
                        _listener.Start();

                        _serverThread = new Thread(ListenLoop);
                        _serverThread.IsBackground = true;
                        _serverThread.Start();

                        targetUrl = "http://localhost:" + port + "/";
                    }
                    catch
                    {
                        targetUrl = "https://k39139215-gif.github.io/verasett-social-dashboard-preview/";
                    }
                }

                Thread bgSync = new Thread(BackgroundSyncLoop);
                bgSync.IsBackground = true;
                bgSync.Start();

                LaunchNativeAppWindow(targetUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to launch ShowUp: " + ex.Message, "ShowUp", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void BackgroundSyncLoop()
        {
            Thread.Sleep(3000);
            ExecuteSyncScript();

            while (true)
            {
                Thread.Sleep(30 * 60 * 1000);
                ExecuteSyncScript();
            }
        }

        private static string ExecuteSyncScript(string handle = "kartikBhosaleHQ")
        {
            try
            {
                string scriptPath = Path.Combine(_baseDir, "scripts", "sync-x-public.mjs");
                if (!File.Exists(scriptPath))
                {
                    string parentScript = Path.Combine(_baseDir, "..", "scripts", "sync-x-public.mjs");
                    if (File.Exists(parentScript)) scriptPath = parentScript;
                }

                if (!File.Exists(scriptPath))
                {
                    return "{\"success\":false,\"error\":\"sync script not found\"}";
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "node";
                psi.Arguments = "\"" + scriptPath + "\"";
                psi.WorkingDirectory = _baseDir;
                psi.EnvironmentVariables["X_HANDLE"] = handle;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                using (Process p = Process.Start(psi))
                {
                    string stdout = p.StandardOutput.ReadToEnd();
                    p.WaitForExit(30000);
                    return "{\"success\":true,\"message\":\"Synced successfully\",\"output\":\"" + stdout.Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ") + "\"}";
                }
            }
            catch (Exception ex)
            {
                return "{\"success\":false,\"error\":\"" + ex.Message.Replace("\"", "\\\"") + "\"}";
            }
        }

        private static void LaunchNativeAppWindow(string url)
        {
            string[] possibleBrowsers = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe")
            };

            string browserPath = null;
            foreach (string p in possibleBrowsers)
            {
                if (File.Exists(p))
                {
                    browserPath = p;
                    break;
                }
            }

            string appArgs = "--app=\"" + url + "\" --window-size=1260,820 --disable-pinch --disable-features=TouchpadPinchToZoom,TouchpadPinchToZoomSettings --overscroll-history-navigation=0";

            if (browserPath != null)
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = browserPath;
                psi.Arguments = appArgs;
                psi.UseShellExecute = false;
                Process.Start(psi);
            }
            else
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
        }

        private static void ListenLoop()
        {
            while (_listener != null && _listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem((c) => HandleRequest((HttpListenerContext)c), context);
                }
                catch
                {
                    break;
                }
            }
        }

        private static void HandleRequest(HttpListenerContext context)
        {
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath;

                if (rawUrl == "/api/sync-x")
                {
                    string handle = context.Request.QueryString["handle"];
                    if (string.IsNullOrEmpty(handle)) handle = "kartikBhosaleHQ";
                    string json = ExecuteSyncScript(handle);
                    byte[] jsonBytes = Encoding.UTF8.GetBytes(json);
                    context.Response.ContentType = "application/json; charset=utf-8";
                    context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                    context.Response.ContentLength64 = jsonBytes.Length;
                    context.Response.OutputStream.Write(jsonBytes, 0, jsonBytes.Length);
                    context.Response.OutputStream.Close();
                    return;
                }

                if (string.IsNullOrEmpty(rawUrl) || rawUrl == "/")
                {
                    rawUrl = "/index.html";
                }

                string localPath = Path.Combine(_webRoot, rawUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (!File.Exists(localPath))
                {
                    localPath = Path.Combine(_webRoot, "index.html");
                }

                byte[] bytes = File.ReadAllBytes(localPath);
                string ext = Path.GetExtension(localPath).ToLowerInvariant();

                string mime = "application/octet-stream";
                if (ext == ".html") mime = "text/html; charset=utf-8";
                else if (ext == ".js") mime = "application/javascript; charset=utf-8";
                else if (ext == ".css") mime = "text/css; charset=utf-8";
                else if (ext == ".svg") mime = "image/svg+xml";
                else if (ext == ".png") mime = "image/png";
                else if (ext == ".jpg" || ext == ".jpeg") mime = "image/jpeg";
                else if (ext == ".json") mime = "application/json";

                context.Response.ContentType = mime;
                context.Response.ContentLength64 = bytes.Length;
                context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                context.Response.OutputStream.Close();
            }
            catch
            {
                try { context.Response.StatusCode = 500; context.Response.Close(); } catch { }
            }
        }
    }
}
