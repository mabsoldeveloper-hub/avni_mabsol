"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

export default function RolePermissionPage() {

  const { id } = useParams();

  const [permissions, setPermissions] =
    useState<any[]>([]);

  const [checked, setChecked] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {

    loadPermissions();

    loadRolePermissions();

  }, []);

  // Load All Permissions

  const loadPermissions = async () => {

    const res =
      await fetch("/api/permissions");

    const data =
      await res.json();

    setPermissions(data);

  };

  // Load Existing Role Permissions

  const loadRolePermissions = async () => {

    const res =
      await fetch(
        `/api/role-permissions/${id}`
      );

    const data =
      await res.json();

    // const arr =
    //   data.map(
    //     (x:any)=>
    //       x.permissionId
    //   );

    // setChecked(arr);
    const arr = data
      .filter((x: any) => x.permissionId)
      .map((x: any) => x.permissionId._id);

    setChecked(arr);

  };

  // Checkbox

  const togglePermission =
  (permissionId:string)=>{

    if(
      checked.includes(permissionId)
    ){

      setChecked(

        checked.filter(
          x=>x!==permissionId
        )

      );

    }else{

      setChecked([
        ...checked,
        permissionId,
      ]);

    }

  };

  // Save

  const savePermissions =
  async()=>{

    setLoading(true);

    const permissionsData =
      checked.map(
        (pid)=>({

          roleId:id,

          permissionId:pid,

          allow:true,

        })
      );

    await fetch(
      "/api/role-permissions",
      {

        method:"POST",

        headers:{
          "Content-Type":
          "application/json",
        },

        body:JSON.stringify({

          roleId:id,

          permissions:
          permissionsData,

        }),

      }
    );

    alert(
      "Permissions Saved Successfully"
    );

    setLoading(false);

  };

  // Group Module

  const grouped =
    permissions.reduce(
      (acc:any,item:any)=>{

        if(
          !acc[item.moduleName]
        ){

          acc[item.moduleName]=[];

        }

        acc[item.moduleName]
        .push(item);

        return acc;

      },{}
    );

  return (

<div className="card shadow border-0">

<div className="card-body">

<h3>

Role Permission

</h3>

<hr/>

{

Object.keys(grouped).map(

(module)=>(

<div
className="card mb-4"
key={module}
>

<div
className="card-header bg-primary text-white fw-bold"
>

{module}

</div>

<div className="card-body">

<div className="row">

{

grouped[module].map(

(permission:any)=>(

<div
className="col-md-4 mb-3"
key={permission._id}
>

<div className="form-check">

<input

type="checkbox"

className="form-check-input"

checked={
checked.includes(
permission._id
)
}

onChange={()=>

togglePermission(
permission._id
)

}

/>

<label
className="form-check-label"
>

{permission.permissionName}

</label>

</div>

</div>

)

)

}

</div>

</div>

</div>

)

)

}

<button
className="px-6 py-2.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
disabled={loading}
onClick={savePermissions}
>

{

loading

?

"Saving..."

:

"Save Permissions"

}

</button>

</div>

</div>

);

}