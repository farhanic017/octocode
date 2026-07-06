# Copyright (C) 2026 Farhan Dhrubo
# SPDX-License-Identifier: GPL-3.0-or-later
# This file is part of OctoCode Desktop Extension.
"""
OctoCode Blender MCP Addon
Runs inside Blender as a TCP socket server on port 9876.
OctoCode connects to this to control Blender remotely.
"""
import bpy
import socket
import json
import threading
import os
import sys
import tempfile
import traceback

bl_info = {
    "name": "OctoCode Blender MCP",
    "blender": (3, 0, 0),
    "category": "System",
    "version": (1, 0, 0),
    "author": "Farhan Dhrubo / OctoCode",
    "description": "Connect OctoCode AI to Blender via TCP socket",
}

HOST = "localhost"
PORT = 9876

server_running = False
server_socket = None
server_thread = None


def execute_code(code):
    """Execute Python code in Blender's context and return the result"""
    try:
        local_ns = {"bpy": bpy}
        exec(code, globals(), local_ns)
        result = local_ns.get("result", "Code executed successfully")
        return {"status": "success", "result": str(result)}
    except Exception as e:
        return {"status": "error", "message": f"{type(e).__name__}: {str(e)}"}


def get_scene_info():
    """Get information about the current Blender scene"""
    scene = bpy.context.scene
    objects = []
    for obj in scene.objects:
        obj_info = {
            "name": obj.name,
            "type": obj.type,
            "location": list(obj.location),
            "rotation": list(obj.rotation_euler),
            "scale": list(obj.scale),
            "visible": obj.visible_get(),
        }
        objects.append(obj_info)

    return {
        "scene_name": scene.name,
        "object_count": len(scene.objects),
        "objects": objects,
        "frame_current": scene.frame_current,
        "frame_start": scene.frame_start,
        "frame_end": scene.frame_end,
        "render_engine": scene.render.engine,
        "camera": scene.camera.name if scene.camera else None,
    }


def get_object_info(name):
    """Get information about a specific object"""
    obj = bpy.data.objects.get(name)
    if not obj:
        return {"error": f"Object '{name}' not found"}

    info = {
        "name": obj.name,
        "type": obj.type,
        "location": list(obj.location),
        "rotation": list(obj.rotation_euler),
        "scale": list(obj.scale),
        "dimensions": list(obj.dimensions),
        "visible": obj.visible_get(),
    }

    if obj.type == "MESH":
        mesh = obj.data
        info["vertex_count"] = len(mesh.vertices)
        info["face_count"] = len(mesh.polygons)
        info["edge_count"] = len(mesh.edges)

    if obj.data.materials:
        info["materials"] = [m.name if m else "None" for m in obj.data.materials]

    info["modifiers"] = [{"name": m.name, "type": m.type} for m in obj.modifiers]
    info["parent"] = obj.parent.name if obj.parent else None

    return info


def take_viewport_screenshot(filepath, max_size=1000):
    """Capture the 3D viewport as an image"""
    for area in bpy.context.screen.areas:
        if area.type == "VIEW_3D":
            override = bpy.context.copy()
            override["area"] = area
            override["region"] = area.regions[-1]

            with bpy.context.temp_override(**override):
                bpy.ops.render.opengl(write_still=True, view_context=True)

            # Move the rendered file to our target path
            render_path = bpy.data.scenes["Scene"].render.filepath
            if render_path and os.path.exists(str(render_path)):
                import shutil
                shutil.copy2(str(render_path), filepath)
                return {"status": "success", "filepath": filepath}

            # Fallback: save viewport screenshot directly
            bpy.context.scene.render.filepath = filepath
            bpy.ops.render.opengl(write_still=True)
            return {"status": "success", "filepath": filepath}

    return {"error": "No 3D viewport found"}


def handle_command(command):
    """Route a command to the appropriate handler"""
    cmd_type = command.get("type", "")
    params = command.get("params", {})

    try:
        if cmd_type == "get_scene_info":
            return {"status": "success", "result": get_scene_info()}

        elif cmd_type == "get_object_info":
            return {"status": "success", "result": get_object_info(params.get("name", ""))}

        elif cmd_type == "execute_code":
            return execute_code(params.get("code", ""))

        elif cmd_type == "get_viewport_screenshot":
            temp_dir = tempfile.gettempdir()
            filepath = params.get("filepath", os.path.join(temp_dir, "octocode_viewport.png"))
            return {"status": "success", "result": take_viewport_screenshot(filepath)}

        elif cmd_type == "ping":
            return {"status": "success", "result": "pong"}

        else:
            return {"status": "error", "message": f"Unknown command: {cmd_type}"}

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": f"{type(e).__name__}: {str(e)}"}


def client_handler(conn, addr):
    """Handle a single client connection"""
    print(f"[OctoCode MCP] Client connected: {addr}")
    buffer = b""

    try:
        while True:
            chunk = conn.recv(8192)
            if not chunk:
                break

            buffer += chunk

            # Try to parse complete JSON
            try:
                data = json.loads(buffer.decode("utf-8"))
                buffer = b""

                response = handle_command(data)
                response_bytes = json.dumps(response).encode("utf-8")
                conn.sendall(response_bytes)

            except json.JSONDecodeError:
                continue

    except (ConnectionResetError, BrokenPipeError):
        pass
    finally:
        conn.close()
        print(f"[OctoCode MCP] Client disconnected: {addr}")


def start_server():
    """Start the TCP socket server"""
    global server_running, server_socket

    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.settimeout(1.0)

    try:
        server_socket.bind((HOST, PORT))
        server_socket.listen(5)
        server_running = True
        print(f"[OctoCode MCP] Server started on {HOST}:{PORT}")

        while server_running:
            try:
                conn, addr = server_socket.accept()
                client_handler(conn, addr)
            except socket.timeout:
                continue
            except Exception as e:
                if server_running:
                    print(f"[OctoCode MCP] Error: {e}")

    except OSError as e:
        print(f"[OctoCode MCP] Server error: {e}")
    finally:
        server_running = False
        if server_socket:
            server_socket.close()


def stop_server():
    """Stop the TCP socket server"""
    global server_running, server_socket, server_thread
    server_running = False
    if server_socket:
        server_socket.close()
        server_socket = None
    print("[OctoCode MCP] Server stopped")


class OCTOCODE_OT_StartServer(bpy.types.Operator):
    bl_idname = "octocode.start_mcp_server"
    bl_label = "Start OctoCode MCP Server"
    bl_description = "Start the TCP server for OctoCode connection"

    def execute(self, context):
        global server_thread
        if server_running:
            self.report({"WARNING"}, "Server already running")
            return {"CANCELLED"}

        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()
        self.report({"INFO"}, f"Server started on {HOST}:{PORT}")
        return {"FINISHED"}


class OCTOCODE_OT_StopServer(bpy.types.Operator):
    bl_idname = "octocode.stop_mcp_server"
    bl_label = "Stop OctoCode MCP Server"
    bl_description = "Stop the TCP server"

    def execute(self, context):
        stop_server()
        self.report({"INFO"}, "Server stopped")
        return {"FINISHED"}


class OCTOCODE_PT_Panel(bpy.types.Panel):
    bl_label = "OctoCode MCP"
    bl_idname = "OCTOCODE_PT_Panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "OctoCode"

    def draw(self, context):
        layout = self.layout

        if server_running:
            layout.label(text=f"Server running on {HOST}:{PORT}", icon="PLAY")
            layout.operator("octocode.stop_mcp_server", text="Stop Server", icon="PAUSE")
        else:
            layout.label(text="Server stopped", icon="CANCEL")
            layout.operator("octocode.start_mcp_server", text="Start Server", icon="PLAY")

        layout.separator()
        layout.label(text="Connect OctoCode to control Blender", icon="INFO")


def register():
    bpy.utils.register_class(OCTOCODE_OT_StartServer)
    bpy.utils.register_class(OCTOCODE_OT_StopServer)
    bpy.utils.register_class(OCTOCODE_PT_Panel)
    print("[OctoCode MCP] Addon registered")


def unregister():
    stop_server()
    bpy.utils.unregister_class(OCTOCODE_OT_StartServer)
    bpy.utils.unregister_class(OCTOCODE_OT_StopServer)
    bpy.utils.unregister_class(OCTOCODE_PT_Panel)
    print("[OctoCode MCP] Addon unregistered")


if __name__ == "__main__":
    register()
